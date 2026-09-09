using Toolbox.Domain.Entities;

namespace Toolbox.Application.Items;

public interface IItemRepository
{
    Task<IReadOnlyList<Item>> ListAsync(string? search, CancellationToken cancellationToken);

    Task<Item?> GetAsync(
        Guid id,
        bool includeCheckoutHistory,
        CancellationToken cancellationToken);

    Task AddAsync(Item item, CancellationToken cancellationToken);
    Task AddCheckoutAsync(Checkout checkout, CancellationToken cancellationToken);
    void Remove(Item item);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
