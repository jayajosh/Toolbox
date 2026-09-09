namespace Toolbox.Domain.Entities;

public sealed class Tag
{
    public const int NameMaxLength = 80;

    private Tag()
    {
        Name = null!;
        NormalizedName = null!;
    }

    private Tag(Guid id, string name, DateTime createdAt)
    {
        Id = id == Guid.Empty ? Guid.NewGuid() : id;
        Name = Guard.Required(name, nameof(name), NameMaxLength);
        NormalizedName = Name.ToUpperInvariant();
        CreatedAt = Guard.Utc(createdAt, nameof(createdAt));
        UpdatedAt = CreatedAt;
    }

    public Guid Id { get; private set; }
    public string Name { get; private set; }
    public string NormalizedName { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    public ICollection<ItemTag> ItemTags { get; } = new List<ItemTag>();

    public static Tag Create(
        string name,
        Guid? id = null,
        DateTime? createdAt = null) =>
        new(id ?? Guid.NewGuid(), name, createdAt ?? DateTime.UtcNow);

    public void Rename(string name)
    {
        SetName(name);
        Touch();
    }

    public static string NormalizeName(string name) =>
        Guard.Required(name, nameof(name), NameMaxLength).ToUpperInvariant();

    private void SetName(string name)
    {
        Name = Guard.Required(name, nameof(name), NameMaxLength);
        NormalizedName = Name.ToUpperInvariant();
    }

    private void Touch() => UpdatedAt = DateTime.UtcNow;
}
