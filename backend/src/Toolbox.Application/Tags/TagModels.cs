using Toolbox.Domain.Entities;

namespace Toolbox.Application.Tags;

public sealed record CreateTagCommand(string Name);

public sealed record UpdateTagCommand(string Name);

public sealed record TagSummary(
    Guid Id,
    string Name,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed class TagNotFoundException(Guid id)
    : Exception($"Tag '{id}' was not found.");

public sealed class TagConflictException(string message) : Exception(message);

internal static class TagMapping
{
    public static TagSummary ToSummary(Tag tag) =>
        new(tag.Id, tag.Name, tag.CreatedAt, tag.UpdatedAt);
}
