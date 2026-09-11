using System.ComponentModel.DataAnnotations.Schema;

namespace Toolbox.Domain.Entities;

public sealed class Location
{
    public static readonly Guid UnorganisedId = Guid.Parse("ffffffff-ffff-ffff-ffff-ffffffffffff");
    public const string DefaultLocationType = "Other";
    public const int NameMaxLength = 200;
    public const int DescriptionMaxLength = 2_000;
    public const int LocationTypeMaxLength = 50;
    public const int ColorMaxLength = 20;

    private Location()
    {
        Name = null!;
        LocationType = null!;
        Color = null!;
    }

    private Location(
        Guid id,
        string name,
        string? description,
        Guid? parentLocationId,
        string locationType,
        bool isInternalComponent,
        string color,
        DateTime createdAt)
    {
        Id = id == Guid.Empty ? Guid.NewGuid() : id;
        Name = Guard.Required(name, nameof(name), NameMaxLength);
        Description = Guard.Optional(description, nameof(description), DescriptionMaxLength);
        ParentLocationId = parentLocationId;
        LocationType = Guard.Required(locationType, nameof(locationType), LocationTypeMaxLength);
        if (isInternalComponent && parentLocationId is null)
        {
            throw new ArgumentException("An internal component must have a parent storage container.", nameof(parentLocationId));
        }
        IsInternalComponent = isInternalComponent;
        Color = Guard.Required(color, nameof(color), ColorMaxLength);
        CreatedAt = Guard.Utc(createdAt, nameof(createdAt));
        UpdatedAt = CreatedAt;
    }

    public Guid Id { get; private set; }
    public string Name { get; private set; }
    public string? Description { get; private set; }
    public Guid? ParentLocationId { get; private set; }
    public string LocationType { get; private set; }
    public bool IsInternalComponent { get; private set; }
    public string Color { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    [NotMapped]
    public bool IsSystem => Id == UnorganisedId;

    public Location? ParentLocation { get; private set; }
    public ICollection<Location> Children { get; } = new List<Location>();
    public ICollection<Item> Items { get; } = new List<Item>();

    public static Location Create(
        string name,
        string? description = null,
        Guid? parentLocationId = null,
        string locationType = DefaultLocationType,
        bool isInternalComponent = false,
        Guid? id = null,
        DateTime? createdAt = null,
        string color = "#728a77")
    {
        return new Location(
            id ?? Guid.NewGuid(),
            name,
            description,
            parentLocationId,
            locationType,
            isInternalComponent,
            color,
            createdAt ?? DateTime.UtcNow);
    }

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

    public void SetLocationType(string locationType)
    {
        LocationType = Guard.Required(locationType, nameof(locationType), LocationTypeMaxLength);
        Touch();
    }

    public void MoveUnder(Guid? parentLocationId)
    {
        if (parentLocationId == Id)
        {
            throw new ArgumentException("A storage container cannot be its own parent.", nameof(parentLocationId));
        }

        if (parentLocationId is null && IsInternalComponent)
        {
            throw new ArgumentException("An internal component must have a parent storage container.", nameof(parentLocationId));
        }

        ParentLocationId = parentLocationId;
        Touch();
    }

    public void SetInternalComponent(bool isInternalComponent)
    {
        if (isInternalComponent && ParentLocationId is null)
        {
            throw new ArgumentException("An internal component must have a parent storage container.", nameof(isInternalComponent));
        }

        IsInternalComponent = isInternalComponent;
        Touch();
    }

    public void SetColor(string color)
    {
        Color = Guard.Required(color, nameof(color), ColorMaxLength);
        Touch();
    }

    private void Touch() => UpdatedAt = DateTime.UtcNow;
}
