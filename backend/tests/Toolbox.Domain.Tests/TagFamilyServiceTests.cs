using Toolbox.Application.Families;
using Toolbox.Application.Items;
using Toolbox.Application.Locations;
using Toolbox.Application.Tags;
using Toolbox.Domain.Entities;

namespace Toolbox.Domain.Tests;

public sealed class TagFamilyServiceTests
{
    [Fact]
    public async Task TagCreationTrimsAndNormalizesNames()
    {
        var repository = new FakeTagRepository();
        var service = new TagService(repository);

        var tag = await service.CreateAsync(new CreateTagCommand("  Power Tools  "), CancellationToken.None);

        Assert.Equal("Power Tools", tag.Name);
        Assert.Equal("POWER TOOLS", repository.Tags.Single().NormalizedName);
        await Assert.ThrowsAsync<TagConflictException>(() => service.CreateAsync(
            new CreateTagCommand("power tools"),
            CancellationToken.None));
    }

    [Fact]
    public async Task FamilyNestingWorksAndDescendantCyclesAreRejected()
    {
        var repository = new FakeFamilyRepository();
        var service = new FamilyService(repository);
        var root = await service.CreateAsync(
            new CreateFamilyCommand("Tools", null, null),
            CancellationToken.None);
        var child = await service.CreateAsync(
            new CreateFamilyCommand("Power tools", "Corded and cordless", root.Id),
            CancellationToken.None);

        Assert.Equal(root.Id, child.ParentFamilyId);
        await Assert.ThrowsAsync<FamilyConflictException>(() => service.UpdateAsync(
            root.Id,
            new UpdateFamilyCommand("Tools", null, child.Id),
            CancellationToken.None));
    }

    [Fact]
    public async Task ItemAssignmentsArePersistedAndUnknownTagsAreRejected()
    {
        var locations = new FakeLocationRepository();
        var location = locations.Add(Location.Create("Garage"));
        var families = new FakeFamilyRepository();
        var family = families.Add(ItemFamily.Create("Tools"));
        var tags = new FakeTagRepository();
        var tag = tags.Add(Tag.Create("Power"));
        var items = new FakeItemRepository();
        var service = new ItemService(items, locations, tags, families);

        var result = await service.CreateAsync(
            new CreateItemCommand("Drill", location.Id, family.Id, [tag.Id]),
            CancellationToken.None);

        Assert.Equal(family.Id, items.Items.Single().FamilyId);
        Assert.Equal(tag.Id, items.Items.Single().ItemTags.Single().TagId);
        Assert.NotNull(result);

        await Assert.ThrowsAsync<TagNotFoundForItemException>(() => service.CreateAsync(
            new CreateItemCommand("Saw", location.Id, null, [Guid.NewGuid()]),
            CancellationToken.None));
    }

    private sealed class FakeTagRepository : ITagRepository
    {
        public List<Tag> Tags { get; } = [];

        public Tag Add(Tag tag)
        {
            Tags.Add(tag);
            return tag;
        }

        public Task<IReadOnlyList<Tag>> ListAsync(string? search, CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<Tag>>(Tags
                .Where(tag => string.IsNullOrWhiteSpace(search)
                    || tag.Name.Contains(search, StringComparison.OrdinalIgnoreCase))
                .ToArray());

        public Task<Tag?> GetAsync(Guid id, bool includeUsage, CancellationToken cancellationToken) =>
            Task.FromResult(Tags.SingleOrDefault(tag => tag.Id == id));

        public Task<IReadOnlyList<Tag>> GetByIdsAsync(
            IReadOnlyCollection<Guid> ids,
            CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<Tag>>(Tags.Where(tag => ids.Contains(tag.Id)).ToArray());

        public Task<bool> ExistsWithNormalizedNameAsync(
            string normalizedName,
            Guid? excludingId,
            CancellationToken cancellationToken) =>
            Task.FromResult(Tags.Any(tag => tag.NormalizedName == normalizedName
                && tag.Id != excludingId));

        public Task AddAsync(Tag tag, CancellationToken cancellationToken)
        {
            Add(tag);
            return Task.CompletedTask;
        }

        public void Remove(Tag tag) => Tags.Remove(tag);
        public Task SaveChangesAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private sealed class FakeFamilyRepository : IFamilyRepository
    {
        public List<ItemFamily> Families { get; } = [];

        public ItemFamily Add(ItemFamily family)
        {
            Families.Add(family);
            if (family.ParentFamilyId is { } parentId
                && Families.SingleOrDefault(candidate => candidate.Id == parentId) is { } parent)
            {
                parent.Children.Add(family);
            }

            return family;
        }

        public Task<IReadOnlyList<ItemFamily>> ListAsync(CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<ItemFamily>>(Families.ToArray());

        public Task<ItemFamily?> GetAsync(Guid id, bool includeContents, CancellationToken cancellationToken) =>
            Task.FromResult(Families.SingleOrDefault(family => family.Id == id));

        public Task AddAsync(ItemFamily family, CancellationToken cancellationToken)
        {
            Add(family);
            return Task.CompletedTask;
        }

        public void Remove(ItemFamily family) => Families.Remove(family);
        public Task SaveChangesAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private sealed class FakeLocationRepository : ILocationRepository
    {
        public List<Location> Locations { get; } = [];

        public Location Add(Location location)
        {
            Locations.Add(location);
            return location;
        }

        public Task<IReadOnlyList<Location>> ListAsync(CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<Location>>(Locations.ToArray());

        public Task<Location?> GetAsync(Guid id, bool includeContents, CancellationToken cancellationToken) =>
            Task.FromResult(Locations.SingleOrDefault(location => location.Id == id));

        public Task AddAsync(Location location, CancellationToken cancellationToken)
        {
            Add(location);
            return Task.CompletedTask;
        }

        public void Remove(Location location) => Locations.Remove(location);
        public Task SaveChangesAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private sealed class FakeItemRepository : IItemRepository
    {
        public List<Item> Items { get; } = [];

        public Task<IReadOnlyList<Item>> ListAsync(string? search, CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<Item>>(Items.ToArray());

        public Task<Item?> GetAsync(Guid id, bool includeCheckoutHistory, CancellationToken cancellationToken) =>
            Task.FromResult(Items.SingleOrDefault(item => item.Id == id));

        public Task AddAsync(Item item, CancellationToken cancellationToken)
        {
            Items.Add(item);
            return Task.CompletedTask;
        }

        public Task AddCheckoutAsync(Checkout checkout, CancellationToken cancellationToken)
        {
            var item = Items.Single(item => item.Id == checkout.ItemId);
            item.Checkouts.Add(checkout);
            return Task.CompletedTask;
        }

        public void Remove(Item item) => Items.Remove(item);
        public Task SaveChangesAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
