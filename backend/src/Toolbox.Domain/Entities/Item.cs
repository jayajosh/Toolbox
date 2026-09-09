namespace Toolbox.Domain.Entities;

public sealed class Item
{
    public const int NameMaxLength = 200;

    private Item()
    {
        Name = null!;
    }

    private Item(
        Guid id,
        string name,
        Guid locationId,
        Guid? familyId,
        bool isConsumable,
        ConsumableStatus? consumableStatus,
        DateTime createdAt)
    {
        Id = id == Guid.Empty ? Guid.NewGuid() : id;
        Name = Guard.Required(name, nameof(name), NameMaxLength);
        LocationId = Guard.Required(locationId, nameof(locationId));
        FamilyId = familyId;
        IsConsumable = isConsumable;
        ConsumableStatus = isConsumable ? consumableStatus : null;
        CreatedAt = Guard.Utc(createdAt, nameof(createdAt));
        UpdatedAt = CreatedAt;
    }

    public Guid Id { get; private set; }
    public string Name { get; private set; }
    public Guid LocationId { get; private set; }
    public Guid? FamilyId { get; private set; }
    public bool IsConsumable { get; private set; }
    public ConsumableStatus? ConsumableStatus { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    public Location Location { get; private set; } = null!;
    public ItemFamily? Family { get; private set; }
    public ICollection<Checkout> Checkouts { get; } = new List<Checkout>();
    public ICollection<ItemTag> ItemTags { get; } = new List<ItemTag>();

    public static Item Create(
        string name,
        Guid locationId,
        Guid? id = null,
        DateTime? createdAt = null,
        Guid? familyId = null,
        bool isConsumable = false,
        ConsumableStatus? consumableStatus = null)
    {
        return new Item(
            id ?? Guid.NewGuid(),
            name,
            locationId,
            familyId,
            isConsumable,
            consumableStatus,
            createdAt ?? DateTime.UtcNow);
    }

    public void Rename(string name)
    {
        Name = Guard.Required(name, nameof(name), NameMaxLength);
        Touch();
    }

    public void MoveTo(Guid locationId)
    {
        LocationId = Guard.Required(locationId, nameof(locationId));
        Touch();
    }

    public void SetFamily(Guid? familyId)
    {
        FamilyId = familyId;
        Touch();
    }

    public void SetConsumable(bool isConsumable, ConsumableStatus? consumableStatus)
    {
        IsConsumable = isConsumable;
        ConsumableStatus = isConsumable ? consumableStatus : null;
        Touch();
    }

    public void ReplaceTags(IEnumerable<Tag> tags)
    {
        var desiredTags = tags.GroupBy(tag => tag.Id).Select(group => group.First()).ToArray();
        var desiredIds = desiredTags.Select(tag => tag.Id).ToHashSet();

        foreach (var itemTag in ItemTags.Where(itemTag => !desiredIds.Contains(itemTag.TagId)).ToArray())
        {
            ItemTags.Remove(itemTag);
        }

        foreach (var tag in desiredTags.Where(tag => ItemTags.All(itemTag => itemTag.TagId != tag.Id)))
        {
            ItemTags.Add(ItemTag.Create(Id, tag.Id));
        }

        Touch();
    }

    private void Touch() => UpdatedAt = DateTime.UtcNow;
}
