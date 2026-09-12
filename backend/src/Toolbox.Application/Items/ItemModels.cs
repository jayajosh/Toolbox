using Toolbox.Domain.Entities;

namespace Toolbox.Application.Items;

public sealed class ItemFeatureOptions
{
    public bool Checkout { get; set; } = true;
    public bool CheckoutHistory { get; set; } = true;
}

public sealed record CreateItemCommand(
    string Name,
    Guid LocationId,
    Guid? FamilyId = null,
    IReadOnlyList<Guid>? TagIds = null,
    bool IsConsumable = false,
    ConsumableStatus? ConsumableStatus = null);

public sealed record QuickAddItemsCommand(
    string NamePattern,
    int StartNumber,
    int EndNumber,
    Guid LocationId,
    Guid? FamilyId = null,
    IReadOnlyList<Guid>? TagIds = null,
    bool IsConsumable = false,
    ConsumableStatus? ConsumableStatus = null);

public sealed record ImportItemsCommand(
    Guid LocationId,
    IReadOnlyList<ImportItemCommand> Items);

public sealed record ImportItemCommand(string Name, Guid? FamilyId = null);

public sealed record ImportedItem(Guid Id, string Name);

public sealed record UpdateItemCommand(
    string Name,
    Guid LocationId,
    Guid? FamilyId = null,
    IReadOnlyList<Guid>? TagIds = null,
    bool IsConsumable = false,
    ConsumableStatus? ConsumableStatus = null);

public sealed record CheckoutItemCommand(string BorrowerName, string? Notes = null);
public sealed record CheckinItemCommand(string? Notes = null);

public sealed record FamilyReference(Guid Id, string Name, Guid? ParentFamilyId);

public sealed record TagReference(Guid Id, string Name);

public sealed record ItemSummary(
    Guid Id,
    string Name,
    Guid LocationId,
    string LocationPath,
    string LocationColor,
    bool IsCheckedOut,
    CheckoutSummary? ActiveCheckout,
    FamilyReference? Family,
    IReadOnlyList<TagReference> Tags,
    bool IsConsumable,
    ConsumableStatus? ConsumableStatus);

public sealed record ItemDetails(
    Guid Id,
    string Name,
    Guid LocationId,
    string LocationPath,
    string LocationColor,
    bool IsCheckedOut,
    CheckoutSummary? ActiveCheckout,
    IReadOnlyList<CheckoutSummary> CheckoutHistory,
    FamilyReference? Family,
    IReadOnlyList<TagReference> Tags,
    bool IsConsumable,
    ConsumableStatus? ConsumableStatus);

public sealed record CheckoutSummary(
    Guid Id,
    DateTime CheckedOutAt,
    DateTime? ReturnedAt,
    string BorrowerName,
    string? Notes,
    string? ReturnedNotes);

public sealed class ItemNotFoundException(Guid id)
    : Exception($"Item '{id}' was not found.");

public sealed class ItemConflictException(string message) : Exception(message);

public sealed class TagNotFoundForItemException(IReadOnlyCollection<Guid> ids)
    : Exception($"The following tags were not found: {string.Join(", ", ids)}.");
