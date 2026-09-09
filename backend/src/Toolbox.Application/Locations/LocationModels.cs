using Toolbox.Domain.Entities;

namespace Toolbox.Application.Locations;

public sealed record CreateLocationCommand(
    string Name,
    string? Description,
    Guid? ParentLocationId,
    string LocationType,
    bool IsInternalComponent = false,
    string Color = "#728a77");

public sealed record UpdateLocationCommand(
    string Name,
    string? Description,
    Guid? ParentLocationId,
    string LocationType,
    bool IsInternalComponent = false,
    string Color = "#728a77");

public sealed record LocationSummary(
    Guid Id,
    string Name,
    string? Description,
    Guid? ParentLocationId,
    string LocationType,
    bool IsInternalComponent,
    int ChildCount,
    int ItemCount,
    bool IsSystem,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string Color);

public sealed record ItemSummary(Guid Id, string Name, bool IsConsumable, ConsumableStatus? ConsumableStatus);

public sealed record LocationDetails(
    Guid Id,
    string Name,
    string? Description,
    Guid? ParentLocationId,
    string LocationType,
    bool IsInternalComponent,
    IReadOnlyList<LocationSummary> Children,
    IReadOnlyList<ItemSummary> Items,
    bool IsSystem,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string Color);

public sealed class LocationTreeNode
{
    public LocationTreeNode(LocationSummary location)
    {
        Id = location.Id;
        Name = location.Name;
        Description = location.Description;
        ParentLocationId = location.ParentLocationId;
        LocationType = location.LocationType;
        IsInternalComponent = location.IsInternalComponent;
        Color = location.Color;
        ChildCount = location.ChildCount;
        ItemCount = location.ItemCount;
        IsSystem = location.IsSystem;
    }

    public Guid Id { get; }
    public string Name { get; }
    public string? Description { get; }
    public Guid? ParentLocationId { get; }
    public string LocationType { get; }
    public bool IsInternalComponent { get; }
    public string Color { get; }
    public int ChildCount { get; }
    public int ItemCount { get; }
    public bool IsSystem { get; }
    public List<LocationTreeNode> Children { get; } = [];
}

public sealed class LocationNotFoundException(Guid id)
    : Exception($"Location '{id}' was not found.");

public sealed class LocationConflictException(string message) : Exception(message);

internal static class LocationMapping
{
    public static LocationSummary ToSummary(Location location, int childCount = 0) =>
        new(
            location.Id,
            location.Name,
            location.Description,
            location.ParentLocationId,
            location.LocationType,
            location.IsInternalComponent,
            childCount,
            location.Items.Count,
            location.IsSystem,
            location.CreatedAt,
             location.UpdatedAt,
             location.Color);
}
