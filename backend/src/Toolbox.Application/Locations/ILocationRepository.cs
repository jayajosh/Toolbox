using Toolbox.Domain.Entities;

namespace Toolbox.Application.Locations;

public interface ILocationRepository
{
    Task<IReadOnlyList<Location>> ListAsync(CancellationToken cancellationToken);

    Task<Location?> GetAsync(
        Guid id,
        bool includeContents,
        CancellationToken cancellationToken);

    Task AddAsync(Location location, CancellationToken cancellationToken);
    void Remove(Location location);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
