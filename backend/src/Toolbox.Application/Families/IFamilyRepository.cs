using Toolbox.Domain.Entities;

namespace Toolbox.Application.Families;

public interface IFamilyRepository
{
    Task<IReadOnlyList<ItemFamily>> ListAsync(CancellationToken cancellationToken);

    Task<ItemFamily?> GetAsync(
        Guid id,
        bool includeContents,
        CancellationToken cancellationToken);

    Task AddAsync(ItemFamily family, CancellationToken cancellationToken);
    void Remove(ItemFamily family);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
