using Toolbox.Domain.Entities;

namespace Toolbox.Application.Tags;

public interface ITagRepository
{
    Task<IReadOnlyList<Tag>> ListAsync(string? search, CancellationToken cancellationToken);

    Task<Tag?> GetAsync(Guid id, bool includeUsage, CancellationToken cancellationToken);

    Task<IReadOnlyList<Tag>> GetByIdsAsync(
        IReadOnlyCollection<Guid> ids,
        CancellationToken cancellationToken);

    Task<bool> ExistsWithNormalizedNameAsync(
        string normalizedName,
        Guid? excludingId,
        CancellationToken cancellationToken);

    Task AddAsync(Tag tag, CancellationToken cancellationToken);
    void Remove(Tag tag);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
