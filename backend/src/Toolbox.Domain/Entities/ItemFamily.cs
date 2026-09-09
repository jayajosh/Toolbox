namespace Toolbox.Domain.Entities;

public sealed class ItemFamily
{
    public const int NameMaxLength = 160;
    public const int DescriptionMaxLength = 1_000;

    private ItemFamily()
    {
        Name = null!;
    }

    private ItemFamily(
        Guid id,
        string name,
        string? description,
        Guid? parentFamilyId,
        DateTime createdAt)
    {
        Id = id == Guid.Empty ? Guid.NewGuid() : id;
        Name = Guard.Required(name, nameof(name), NameMaxLength);
        Description = Guard.Optional(description, nameof(description), DescriptionMaxLength);
        ParentFamilyId = parentFamilyId;
        CreatedAt = Guard.Utc(createdAt, nameof(createdAt));
        UpdatedAt = CreatedAt;
    }

    public Guid Id { get; private set; }
    public string Name { get; private set; }
    public string? Description { get; private set; }
    public Guid? ParentFamilyId { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    public ItemFamily? ParentFamily { get; private set; }
    public ICollection<ItemFamily> Children { get; } = new List<ItemFamily>();
    public ICollection<Item> Items { get; } = new List<Item>();

    public static ItemFamily Create(
        string name,
        string? description = null,
        Guid? parentFamilyId = null,
        Guid? id = null,
        DateTime? createdAt = null) =>
        new(
            id ?? Guid.NewGuid(),
            name,
            description,
            parentFamilyId,
            createdAt ?? DateTime.UtcNow);

    public void Rename(string name)
    {
        Name = Guard.Required(name, nameof(name), NameMaxLength);
        Touch();
    }

    public void UpdateDescription(string? description)
    {
        Description = Guard.Optional(description, nameof(description), DescriptionMaxLength);
        Touch();
    }

    public void MoveUnder(Guid? parentFamilyId)
    {
        if (parentFamilyId == Id)
        {
            throw new ArgumentException("A family cannot be its own parent.", nameof(parentFamilyId));
        }

        ParentFamilyId = parentFamilyId;
        Touch();
    }

    private void Touch() => UpdatedAt = DateTime.UtcNow;
}
