using Toolbox.Domain.Entities;

namespace Toolbox.Application.Families;

public sealed record CreateFamilyCommand(
    string Name,
    string? Description,
    Guid? ParentFamilyId);

public sealed record UpdateFamilyCommand(
    string Name,
    string? Description,
    Guid? ParentFamilyId);

public sealed record FamilySummary(
    Guid Id,
    string Name,
    string? Description,
    Guid? ParentFamilyId,
    int ChildCount,
    int ItemCount,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed class FamilyTreeNode
{
    public FamilyTreeNode(FamilySummary family)
    {
        Id = family.Id;
        Name = family.Name;
        Description = family.Description;
        ParentFamilyId = family.ParentFamilyId;
        ChildCount = family.ChildCount;
        ItemCount = family.ItemCount;
    }

    public Guid Id { get; }
    public string Name { get; }
    public string? Description { get; }
    public Guid? ParentFamilyId { get; }
    public int ChildCount { get; }
    public int ItemCount { get; }
    public List<FamilyTreeNode> Children { get; } = [];
}

public sealed class FamilyNotFoundException(Guid id)
    : Exception($"Family '{id}' was not found.");

public sealed class FamilyConflictException(string message) : Exception(message);

internal static class FamilyMapping
{
    public static FamilySummary ToSummary(ItemFamily family) =>
        new(
            family.Id,
            family.Name,
            family.Description,
            family.ParentFamilyId,
            family.Children.Count,
            family.Items.Count,
            family.CreatedAt,
            family.UpdatedAt);
}
