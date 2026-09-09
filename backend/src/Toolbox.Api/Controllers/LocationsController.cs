using Microsoft.AspNetCore.Mvc;
using Toolbox.Application.Locations;

namespace Toolbox.Api.Controllers;

[ApiController]
[Route("api/locations")]
public sealed class LocationsController(LocationService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<LocationSummary>>> List(CancellationToken cancellationToken) =>
        Ok(await service.ListAsync(cancellationToken));

    [HttpGet("tree")]
    public async Task<ActionResult<IReadOnlyList<LocationTreeNode>>> Tree(CancellationToken cancellationToken) =>
        Ok(await service.GetTreeAsync(cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LocationDetails>> Get(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await service.GetAsync(id, cancellationToken));
        }
        catch (LocationNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
    }

    [HttpPost]
    public async Task<ActionResult<LocationDetails>> Create(
        LocationRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var location = await service.CreateAsync(request.ToCreateCommand(), cancellationToken);
            return CreatedAtAction(nameof(Get), new { id = location.Id }, location);
        }
        catch (LocationNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { error = exception.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<LocationDetails>> Update(
        Guid id,
        LocationRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var location = await service.UpdateAsync(id, request.ToUpdateCommand(), cancellationToken);
            return Ok(location);
        }
        catch (LocationNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (LocationConflictException exception)
        {
            return Conflict(new { error = exception.Message });
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
        catch (LocationNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (LocationConflictException exception)
        {
            return Conflict(new { error = exception.Message });
        }
    }
}

public sealed record LocationRequest(
    string Name,
    string? Description,
    Guid? ParentLocationId,
    string LocationType = "Other",
    bool IsInternalComponent = false,
    string Color = "#728a77")
{
    public CreateLocationCommand ToCreateCommand() =>
        new(Name, Description, ParentLocationId, LocationType, IsInternalComponent, Color);

    public UpdateLocationCommand ToUpdateCommand() =>
        new(Name, Description, ParentLocationId, LocationType, IsInternalComponent, Color);
}
