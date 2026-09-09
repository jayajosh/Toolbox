using Microsoft.AspNetCore.Mvc;
using Toolbox.Application.Families;

namespace Toolbox.Api.Controllers;

[ApiController]
[Route("api/families")]
public sealed class FamiliesController(FamilyService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<FamilySummary>>> List(CancellationToken cancellationToken) =>
        Ok(await service.ListAsync(cancellationToken));

    [HttpGet("tree")]
    public async Task<ActionResult<IReadOnlyList<FamilyTreeNode>>> Tree(CancellationToken cancellationToken) =>
        Ok(await service.GetTreeAsync(cancellationToken));

    [HttpPost]
    public async Task<ActionResult<FamilySummary>> Create(
        FamilyRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var family = await service.CreateAsync(request.ToCreateCommand(), cancellationToken);
            return Created("/api/families", family);
        }
        catch (FamilyNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (FamilyConflictException exception)
        {
            return Conflict(new { error = exception.Message });
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { error = exception.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<FamilySummary>> Update(
        Guid id,
        FamilyRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await service.UpdateAsync(id, request.ToUpdateCommand(), cancellationToken));
        }
        catch (FamilyNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (FamilyConflictException exception)
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
        catch (FamilyNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (FamilyConflictException exception)
        {
            return Conflict(new { error = exception.Message });
        }
    }
}

public sealed record FamilyRequest(string Name, string? Description, Guid? ParentFamilyId)
{
    public CreateFamilyCommand ToCreateCommand() =>
        new(Name, Description, ParentFamilyId);

    public UpdateFamilyCommand ToUpdateCommand() =>
        new(Name, Description, ParentFamilyId);
}
