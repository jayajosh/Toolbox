using Microsoft.AspNetCore.Mvc;
using Toolbox.Application.Items;
using Toolbox.Application.Locations;
using Toolbox.Application.Families;
using Toolbox.Application.Tags;
using Toolbox.Domain.Entities;
using ItemSummaryResponse = Toolbox.Application.Items.ItemSummary;

namespace Toolbox.Api.Controllers;

[ApiController]
[Route("api/items")]
public sealed class ItemsController(ItemService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ItemSummaryResponse>>> List(
        [FromQuery] string? search,
        CancellationToken cancellationToken) =>
        Ok(await service.ListAsync(search, cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ItemDetails>> Get(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await service.GetAsync(id, cancellationToken));
        }
        catch (ItemNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (LocationNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (FamilyNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (TagNotFoundForItemException exception)
        {
            return NotFound(new { error = exception.Message });
        }
    }

    [HttpPost]
    public async Task<ActionResult<ItemDetails>> Create(
        ItemRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var item = await service.CreateAsync(request.ToCreateCommand(), cancellationToken);
            return CreatedAtAction(nameof(Get), new { id = item.Id }, item);
        }
        catch (LocationNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (FamilyNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (TagNotFoundForItemException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { error = exception.Message });
        }
    }

    [HttpPost("quick-add")]
    public async Task<ActionResult<IReadOnlyList<ItemDetails>>> QuickAdd(
        QuickAddItemsRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var items = await service.QuickAddAsync(request.ToCommand(), cancellationToken);
            return StatusCode(StatusCodes.Status201Created, items);
        }
        catch (LocationNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (FamilyNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (TagNotFoundForItemException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { error = exception.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ItemDetails>> Update(
        Guid id,
        ItemRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var item = await service.UpdateAsync(id, request.ToUpdateCommand(), cancellationToken);
            return Ok(item);
        }
        catch (ItemNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (LocationNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (FamilyNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (TagNotFoundForItemException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { error = exception.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            await service.DeleteAsync(id, cancellationToken);
            return NoContent();
        }
        catch (ItemNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (ItemConflictException exception)
        {
            return Conflict(new { error = exception.Message });
        }
    }

    [HttpPost("{id:guid}/checkout")]
    public async Task<ActionResult<ItemDetails>> Checkout(Guid id, CheckoutItemRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await service.CheckoutAsync(id, new CheckoutItemCommand(request.BorrowerName, request.Notes), cancellationToken));
        }
        catch (ItemNotFoundException exception) { return NotFound(new { error = exception.Message }); }
        catch (ItemConflictException exception) { return Conflict(new { error = exception.Message }); }
        catch (ArgumentException exception) { return BadRequest(new { error = exception.Message }); }
    }

    [HttpPost("{id:guid}/checkin")]
    public async Task<ActionResult<ItemDetails>> Checkin(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await service.CheckinAsync(id, cancellationToken));
        }
        catch (ItemNotFoundException exception) { return NotFound(new { error = exception.Message }); }
        catch (ItemConflictException exception) { return Conflict(new { error = exception.Message }); }
    }
}

public sealed record ItemRequest(
    string Name,
    Guid LocationId,
    Guid? FamilyId = null,
    IReadOnlyList<Guid>? TagIds = null,
    bool IsConsumable = false,
    ConsumableStatus? ConsumableStatus = null)
{
    public CreateItemCommand ToCreateCommand() =>
        new(Name, LocationId, FamilyId, TagIds, IsConsumable, ConsumableStatus);

    public UpdateItemCommand ToUpdateCommand() =>
        new(Name, LocationId, FamilyId, TagIds, IsConsumable, ConsumableStatus);
}

public sealed record QuickAddItemsRequest(
    string NamePattern,
    int StartNumber,
    int EndNumber,
    Guid LocationId,
    Guid? FamilyId = null,
    IReadOnlyList<Guid>? TagIds = null,
    bool IsConsumable = false,
    ConsumableStatus? ConsumableStatus = null)
{
    public QuickAddItemsCommand ToCommand() =>
        new(NamePattern, StartNumber, EndNumber, LocationId, FamilyId, TagIds, IsConsumable, ConsumableStatus);
}

public sealed record CheckoutItemRequest(string BorrowerName, string? Notes = null);
