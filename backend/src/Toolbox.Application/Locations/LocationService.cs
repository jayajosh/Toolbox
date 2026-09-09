using Toolbox.Domain.Entities;

namespace Toolbox.Application.Locations;

public sealed class LocationService(ILocationRepository repository)
{
    public async Task<IReadOnlyList<LocationSummary>> ListAsync(CancellationToken cancellationToken)
    {
        var locations = await repository.ListAsync(cancellationToken);
        var childCounts = locations
            .Where(location => location.ParentLocationId is not null)
            .GroupBy(location => location.ParentLocationId!.Value)
            .ToDictionary(group => group.Key, group => group.Count());

        return locations
            .OrderBy(location => location.Name)
            .Select(location => LocationMapping.ToSummary(
                location,
                childCounts.GetValueOrDefault(location.Id)))
            .ToArray();
    }

    public async Task<IReadOnlyList<LocationTreeNode>> GetTreeAsync(CancellationToken cancellationToken)
    {
        var locations = await ListAsync(cancellationToken);
        var nodes = locations.ToDictionary(location => location.Id, location => new LocationTreeNode(location));
        var roots = new List<LocationTreeNode>();

        foreach (var location in locations)
        {
            var node = nodes[location.Id];
            if (location.ParentLocationId is { } parentId && nodes.TryGetValue(parentId, out var parent))
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

    public async Task<LocationDetails> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var location = await repository.GetAsync(id, includeContents: true, cancellationToken)
            ?? throw new LocationNotFoundException(id);

        return ToDetails(location);
    }

    public async Task<LocationDetails> CreateAsync(
        CreateLocationCommand command,
        CancellationToken cancellationToken)
    {
        var locations = await repository.ListAsync(cancellationToken);
        EnsureParentExists(command.ParentLocationId, locations);

        var location = Location.Create(
            command.Name,
            command.Description,
            command.ParentLocationId,
            command.LocationType,
            command.IsInternalComponent,
            color: command.Color);

        await repository.AddAsync(location, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);
        return await GetAsync(location.Id, cancellationToken);
    }

    public async Task<LocationDetails> UpdateAsync(
        Guid id,
        UpdateLocationCommand command,
        CancellationToken cancellationToken)
    {
        var location = await repository.GetAsync(id, includeContents: true, cancellationToken)
            ?? throw new LocationNotFoundException(id);
        if (location.IsSystem)
        {
            if (command.ParentLocationId is not null
                || command.IsInternalComponent
                || !string.Equals(command.LocationType, "System", StringComparison.Ordinal))
            {
                throw new LocationConflictException("The system fallback location cannot be moved or change type.");
            }

            location.Rename(command.Name);
            location.UpdateDescription(command.Description);
            location.SetColor(command.Color);
            await repository.SaveChangesAsync(cancellationToken);
            return await GetAsync(id, cancellationToken);
        }
        var locations = await repository.ListAsync(cancellationToken);

        EnsureParentExists(command.ParentLocationId, locations);
        EnsureNoCycle(id, command.ParentLocationId, locations);

        location.Rename(command.Name);
        location.UpdateDescription(command.Description);
        location.SetColor(command.Color);
        location.SetLocationType(command.LocationType);
        if (command.IsInternalComponent)
        {
            location.MoveUnder(command.ParentLocationId);
            location.SetInternalComponent(true);
        }
        else
        {
            location.SetInternalComponent(false);
            location.MoveUnder(command.ParentLocationId);
        }

        await repository.SaveChangesAsync(cancellationToken);
        return await GetAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var location = await repository.GetAsync(id, includeContents: true, cancellationToken)
            ?? throw new LocationNotFoundException(id);

        if (location.IsSystem)
        {
            throw new LocationConflictException("The system fallback location cannot be deleted.");
        }

        if (location.Children.Count > 0)
        {
            throw new LocationConflictException("A location with child locations cannot be deleted.");
        }

        if (location.Items.Count > 0
            && await repository.GetAsync(Location.UnorganisedId, includeContents: false, cancellationToken) is null)
        {
            throw new LocationConflictException("The system fallback location is unavailable.");
        }

        foreach (var item in location.Items)
        {
            item.MoveTo(Location.UnorganisedId);
        }

        repository.Remove(location);
        await repository.SaveChangesAsync(cancellationToken);
    }

    private static LocationDetails ToDetails(Location location) =>
        new(
            location.Id,
            location.Name,
            location.Description,
            location.ParentLocationId,
            location.LocationType,
            location.IsInternalComponent,
            location.Children
                .OrderBy(child => child.Name)
                .Select(child => LocationMapping.ToSummary(child, child.Children.Count))
                .ToArray(),
            location.Items
                .OrderBy(item => item.Name)
                .Select(item => new ItemSummary(item.Id, item.Name, item.IsConsumable, item.ConsumableStatus))
                .ToArray(),
            location.IsSystem,
            location.CreatedAt,
            location.UpdatedAt,
            location.Color);

    private static void EnsureParentExists(Guid? parentId, IReadOnlyList<Location> locations)
    {
        if (parentId is not null && locations.All(location => location.Id != parentId.Value))
        {
            throw new LocationNotFoundException(parentId.Value);
        }
    }

    private static void EnsureNoCycle(
        Guid locationId,
        Guid? proposedParentId,
        IReadOnlyList<Location> locations)
    {
        if (proposedParentId is null)
        {
            return;
        }

        var byId = locations.ToDictionary(location => location.Id);
        var currentId = proposedParentId;
        var visited = new HashSet<Guid>();

        while (currentId is { } value)
        {
            if (value == locationId)
            {
                throw new LocationConflictException("A location cannot be moved under itself or one of its descendants.");
            }

            if (!visited.Add(value) || !byId.TryGetValue(value, out var current))
            {
                break;
            }

            currentId = current.ParentLocationId;
        }
    }
}
