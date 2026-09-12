using System.Globalization;
using Toolbox.Application.Locations;
using Toolbox.Application.Families;
using Toolbox.Application.Tags;
using Toolbox.Domain.Entities;

namespace Toolbox.Application.Items;

public sealed class ItemService(
    IItemRepository itemRepository,
    ILocationRepository locationRepository,
    ITagRepository? tagRepository = null,
    IFamilyRepository? familyRepository = null,
    ItemFeatureOptions? featureOptions = null)
{
    private const int MaxQuickAddItems = 100;
    private const int MaxImportItems = 500;
    private readonly ItemFeatureOptions features = featureOptions ?? new ItemFeatureOptions();

    public async Task<IReadOnlyList<ItemSummary>> ListAsync(
        string? search,
        CancellationToken cancellationToken)
    {
        var items = await itemRepository.ListAsync(search, cancellationToken);
        var locations = await GetLocationsAsync(cancellationToken);

        return items
            .OrderBy(item => item.Name)
            .Select(item => ToSummary(item, locations))
            .ToArray();
    }

    public async Task<ItemDetails> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var item = await itemRepository.GetAsync(id, includeCheckoutHistory: true, cancellationToken)
            ?? throw new ItemNotFoundException(id);
        var locations = await GetLocationsAsync(cancellationToken);

        return ToDetails(item, locations);
    }

    public async Task<ItemDetails> CreateAsync(
        CreateItemCommand command,
        CancellationToken cancellationToken)
    {
        await EnsureLocationExists(command.LocationId, cancellationToken);
        var family = await EnsureFamilyExists(command.FamilyId, cancellationToken);
        var tags = await GetTagsAsync(command.TagIds, cancellationToken);

        var item = Item.Create(
            command.Name,
            command.LocationId,
            familyId: family?.Id,
            isConsumable: command.IsConsumable,
            consumableStatus: command.ConsumableStatus);
        item.ReplaceTags(tags);

        await itemRepository.AddAsync(item, cancellationToken);
        await itemRepository.SaveChangesAsync(cancellationToken);
        return await GetAsync(item.Id, cancellationToken);
    }

    public async Task<IReadOnlyList<ItemDetails>> QuickAddAsync(
        QuickAddItemsCommand command,
        CancellationToken cancellationToken)
    {
        if (command.StartNumber > command.EndNumber)
        {
            throw new ArgumentException("The starting number must be less than or equal to the ending number.", nameof(command));
        }

        var count = (long)command.EndNumber - command.StartNumber + 1;
        if (count > MaxQuickAddItems)
        {
            throw new ArgumentException($"Quick add is limited to {MaxQuickAddItems} items at a time.", nameof(command));
        }

        await EnsureLocationExists(command.LocationId, cancellationToken);
        var family = await EnsureFamilyExists(command.FamilyId, cancellationToken);
        var tags = await GetTagsAsync(command.TagIds, cancellationToken);
        var itemIds = new List<Guid>((int)count);

        for (var offset = 0L; offset < count; offset++)
        {
            var number = command.StartNumber + (int)offset;
            var item = Item.Create(
                BuildQuickAddName(command.NamePattern, number),
                command.LocationId,
                familyId: family?.Id,
                isConsumable: command.IsConsumable,
                consumableStatus: command.ConsumableStatus);
            item.ReplaceTags(tags);
            await itemRepository.AddAsync(item, cancellationToken);
            itemIds.Add(item.Id);
        }

        await itemRepository.SaveChangesAsync(cancellationToken);

        var results = new List<ItemDetails>(itemIds.Count);
        foreach (var itemId in itemIds)
        {
            results.Add(await GetAsync(itemId, cancellationToken));
        }

        return results;
    }

    public async Task<IReadOnlyList<ImportedItem>> ImportAsync(
        ImportItemsCommand command,
        CancellationToken cancellationToken)
    {
        if (command.Items.Count == 0)
        {
            throw new ArgumentException("The import must contain at least one item.", nameof(command));
        }

        if (command.Items.Count > MaxImportItems)
        {
            throw new ArgumentException($"Imports are limited to {MaxImportItems} items at a time.", nameof(command));
        }

        await EnsureLocationExists(command.LocationId, cancellationToken);
        var familyIds = command.Items
            .Where(item => item.FamilyId.HasValue)
            .Select(item => item.FamilyId!.Value)
            .Distinct()
            .ToArray();

        foreach (var familyId in familyIds)
        {
            await EnsureFamilyExists(familyId, cancellationToken);
        }

        // Build every entity before tracking any of them so row validation is atomic.
        var items = command.Items
            .Select(input => Item.Create(input.Name, command.LocationId, familyId: input.FamilyId))
            .ToArray();

        foreach (var item in items)
        {
            await itemRepository.AddAsync(item, cancellationToken);
        }

        await itemRepository.SaveChangesAsync(cancellationToken);
        return items.Select(item => new ImportedItem(item.Id, item.Name)).ToArray();
    }

    public async Task<ItemDetails> UpdateAsync(
        Guid id,
        UpdateItemCommand command,
        CancellationToken cancellationToken)
    {
        var item = await itemRepository.GetAsync(id, includeCheckoutHistory: true, cancellationToken)
            ?? throw new ItemNotFoundException(id);
        await EnsureLocationExists(command.LocationId, cancellationToken);
        var family = await EnsureFamilyExists(command.FamilyId, cancellationToken);
        var tags = await GetTagsAsync(command.TagIds, cancellationToken);

        item.Rename(command.Name);
        item.MoveTo(command.LocationId);
        item.SetFamily(family?.Id);
        item.SetConsumable(command.IsConsumable, command.ConsumableStatus);
        item.ReplaceTags(tags);

        await itemRepository.SaveChangesAsync(cancellationToken);
        return await GetAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var item = await itemRepository.GetAsync(id, includeCheckoutHistory: true, cancellationToken)
            ?? throw new ItemNotFoundException(id);

        if (item.Checkouts.Any(checkout => checkout.IsActive))
        {
            throw new ItemConflictException("An item with an active checkout cannot be deleted.");
        }

        if (item.Checkouts.Count > 0)
        {
            throw new ItemConflictException("An item with checkout history cannot be deleted.");
        }

        itemRepository.Remove(item);
        await itemRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task<ItemDetails> CheckoutAsync(Guid id, CheckoutItemCommand command, CancellationToken cancellationToken)
    {
        if (!features.Checkout) throw new ItemConflictException("Checkout is disabled.");
        var item = await itemRepository.GetAsync(id, includeCheckoutHistory: true, cancellationToken)
            ?? throw new ItemNotFoundException(id);
        if (item.Checkouts.Any(checkout => checkout.IsActive))
        {
            throw new ItemConflictException("This item is already checked out.");
        }

        await itemRepository.AddCheckoutAsync(Checkout.Create(item.Id, command.BorrowerName, command.Notes), cancellationToken);
        await itemRepository.SaveChangesAsync(cancellationToken);
        return await GetAsync(id, cancellationToken);
    }

    public async Task<ItemDetails> CheckinAsync(Guid id, CheckinItemCommand command, CancellationToken cancellationToken)
    {
        if (!features.Checkout) throw new ItemConflictException("Checkout is disabled.");
        var item = await itemRepository.GetAsync(id, includeCheckoutHistory: true, cancellationToken)
            ?? throw new ItemNotFoundException(id);
        var checkout = item.Checkouts.SingleOrDefault(candidate => candidate.IsActive)
            ?? throw new ItemConflictException("This item is not checked out.");
        checkout.Return(command.Notes);
        await itemRepository.SaveChangesAsync(cancellationToken);
        return await GetAsync(id, cancellationToken);
    }

    private async Task EnsureLocationExists(Guid locationId, CancellationToken cancellationToken)
    {
        if (await locationRepository.GetAsync(locationId, includeContents: false, cancellationToken) is null)
        {
            throw new LocationNotFoundException(locationId);
        }
    }

    private static string BuildQuickAddName(string pattern, int number)
    {
        var trimmedPattern = pattern.Trim();
        var numberText = number.ToString(CultureInfo.InvariantCulture);
        return trimmedPattern.Contains("{n}", StringComparison.Ordinal)
            ? trimmedPattern.Replace("{n}", numberText, StringComparison.Ordinal)
            : $"{trimmedPattern} {numberText}";
    }

    private async Task<ItemFamily?> EnsureFamilyExists(
        Guid? familyId,
        CancellationToken cancellationToken)
    {
        if (familyId is null)
        {
            return null;
        }

        if (familyRepository is null)
        {
            throw new InvalidOperationException("Family repository is not configured.");
        }

        return await familyRepository.GetAsync(familyId.Value, includeContents: false, cancellationToken)
            ?? throw new FamilyNotFoundException(familyId.Value);
    }

    private async Task<IReadOnlyList<Tag>> GetTagsAsync(
        IReadOnlyList<Guid>? tagIds,
        CancellationToken cancellationToken)
    {
        var distinctIds = (tagIds ?? []).Distinct().ToArray();
        if (distinctIds.Length == 0)
        {
            return [];
        }

        if (tagRepository is null)
        {
            throw new InvalidOperationException("Tag repository is not configured.");
        }

        var tags = await tagRepository.GetByIdsAsync(distinctIds, cancellationToken);
        var foundIds = tags.Select(tag => tag.Id).ToHashSet();
        var missingIds = distinctIds.Where(id => !foundIds.Contains(id)).ToArray();
        if (missingIds.Length > 0)
        {
            throw new TagNotFoundForItemException(missingIds);
        }

        return tags;
    }

    private async Task<IReadOnlyDictionary<Guid, Location>> GetLocationsAsync(
        CancellationToken cancellationToken)
    {
        var locations = await locationRepository.ListAsync(cancellationToken);
        return locations.ToDictionary(location => location.Id);
    }

    private static ItemSummary ToSummary(
        Item item,
        IReadOnlyDictionary<Guid, Location> locations) =>
        new(
            item.Id,
            item.Name,
            item.LocationId,
            BuildLocationPath(item.LocationId, locations),
            locations[item.LocationId].Color,
            item.Checkouts.Any(checkout => checkout.IsActive),
            ToActiveCheckout(item),
            ToFamilyReference(item),
            ToTagReferences(item),
            item.IsConsumable,
            item.ConsumableStatus);

    private ItemDetails ToDetails(
        Item item,
        IReadOnlyDictionary<Guid, Location> locations) =>
        new(
            item.Id,
            item.Name,
            item.LocationId,
            BuildLocationPath(item.LocationId, locations),
            locations[item.LocationId].Color,
            item.Checkouts.Any(checkout => checkout.IsActive),
            ToActiveCheckout(item),
            features.CheckoutHistory
                ? item.Checkouts.OrderByDescending(checkout => checkout.CheckedOutAt).Select(ToCheckoutSummary).ToArray()
                : [],
            ToFamilyReference(item),
            ToTagReferences(item),
            item.IsConsumable,
            item.ConsumableStatus);

    private static FamilyReference? ToFamilyReference(Item item) =>
        item.Family is null
            ? null
            : new FamilyReference(item.Family.Id, item.Family.Name, item.Family.ParentFamilyId);

    private static TagReference[] ToTagReferences(Item item) =>
        item.ItemTags
            .Where(itemTag => itemTag.Tag is not null)
            .OrderBy(itemTag => itemTag.Tag.Name)
            .Select(itemTag => new TagReference(itemTag.Tag.Id, itemTag.Tag.Name))
            .ToArray();

    private static CheckoutSummary? ToActiveCheckout(Item item) =>
        item.Checkouts
            .Where(checkout => checkout.IsActive)
            .OrderByDescending(checkout => checkout.CheckedOutAt)
            .Select(ToCheckoutSummary)
            .FirstOrDefault();

    private static CheckoutSummary ToCheckoutSummary(Checkout checkout) =>
        new(
            checkout.Id,
            checkout.CheckedOutAt,
            checkout.ReturnedAt,
            checkout.BorrowerName,
            checkout.Notes,
            checkout.ReturnedNotes);

    private static string BuildLocationPath(
        Guid locationId,
        IReadOnlyDictionary<Guid, Location> locations)
    {
        var names = new List<string>();
        var visited = new HashSet<Guid>();
        var currentId = locationId;

        while (true)
        {
            if (!visited.Add(currentId)
                || !locations.TryGetValue(currentId, out var location))
            {
                throw new LocationNotFoundException(currentId);
            }

            names.Add(location.Name);
            if (location.ParentLocationId is not { } parentId)
            {
                names.Reverse();
                return string.Join(" / ", names);
            }

            currentId = parentId;
        }
    }
}
