using Toolbox.Domain.Entities;

namespace Toolbox.Application.Families;

public sealed class FamilyService(IFamilyRepository repository)
{
    public async Task<IReadOnlyList<FamilySummary>> ListAsync(CancellationToken cancellationToken)
    {
        var families = await repository.ListAsync(cancellationToken);
        return families.OrderBy(family => family.Name).Select(FamilyMapping.ToSummary).ToArray();
    }

    public async Task<IReadOnlyList<FamilyTreeNode>> GetTreeAsync(CancellationToken cancellationToken)
    {
        var families = await ListAsync(cancellationToken);
        var nodes = families.ToDictionary(family => family.Id, family => new FamilyTreeNode(family));
        var roots = new List<FamilyTreeNode>();

        foreach (var family in families)
        {
            var node = nodes[family.Id];
            if (family.ParentFamilyId is { } parentId && nodes.TryGetValue(parentId, out var parent))
            {
                parent.Children.Add(node);
            }
            else
            {
                roots.Add(node);
            }
        }

        return roots;
    }

    public async Task<FamilySummary> CreateAsync(
        CreateFamilyCommand command,
        CancellationToken cancellationToken)
    {
        var families = await repository.ListAsync(cancellationToken);
        EnsureParentExists(command.ParentFamilyId, families);

        var family = ItemFamily.Create(command.Name, command.Description, command.ParentFamilyId);
        await repository.AddAsync(family, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);
        return FamilyMapping.ToSummary(family);
    }

    public async Task<FamilySummary> UpdateAsync(
        Guid id,
        UpdateFamilyCommand command,
        CancellationToken cancellationToken)
    {
        var family = await repository.GetAsync(id, includeContents: true, cancellationToken)
            ?? throw new FamilyNotFoundException(id);
        var families = await repository.ListAsync(cancellationToken);
        EnsureParentExists(command.ParentFamilyId, families);
        EnsureNoCycle(id, command.ParentFamilyId, families);

        family.Rename(command.Name);
        family.UpdateDescription(command.Description);
        family.MoveUnder(command.ParentFamilyId);
        await repository.SaveChangesAsync(cancellationToken);
        return FamilyMapping.ToSummary(family);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var family = await repository.GetAsync(id, includeContents: true, cancellationToken)
            ?? throw new FamilyNotFoundException(id);

        if (family.Children.Count > 0)
        {
            throw new FamilyConflictException("A family with child families cannot be deleted.");
        }

        if (family.Items.Count > 0)
        {
            throw new FamilyConflictException("A family containing items cannot be deleted.");
        }

        repository.Remove(family);
        await repository.SaveChangesAsync(cancellationToken);
    }

    private static void EnsureParentExists(Guid? parentId, IReadOnlyList<ItemFamily> families)
    {
        if (parentId is not null && families.All(family => family.Id != parentId.Value))
        {
            throw new FamilyNotFoundException(parentId.Value);
        }
    }

    private static void EnsureNoCycle(
        Guid familyId,
        Guid? proposedParentId,
        IReadOnlyList<ItemFamily> families)
    {
        if (proposedParentId is null)
        {
            return;
        }

        var byId = families.ToDictionary(family => family.Id);
        var currentId = proposedParentId;
        var visited = new HashSet<Guid>();

        while (currentId is { } value)
        {
            if (value == familyId)
            {
                throw new FamilyConflictException(
                    "A family cannot be moved under itself or one of its descendants.");
            }

            if (!visited.Add(value) || !byId.TryGetValue(value, out var current))
            {
                break;
            }

            currentId = current.ParentFamilyId;
        }
    }
}
