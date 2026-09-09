using Microsoft.AspNetCore.Mvc;
using Toolbox.Application.Tags;

namespace Toolbox.Api.Controllers;

[ApiController]
[Route("api/tags")]
public sealed class TagsController(TagService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TagSummary>>> List(
        [FromQuery] string? search,
        CancellationToken cancellationToken) =>
        Ok(await service.ListAsync(search, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<TagSummary>> Create(
        TagRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var tag = await service.CreateAsync(new CreateTagCommand(request.Name), cancellationToken);
            return Created("/api/tags", tag);
        }
        catch (TagConflictException exception)
        {
            return Conflict(new { error = exception.Message });
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { error = exception.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TagSummary>> Update(
        Guid id,
        TagRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await service.UpdateAsync(id, new UpdateTagCommand(request.Name), cancellationToken));
        }
        catch (TagNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (TagConflictException exception)
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
        catch (TagNotFoundException exception)
        {
            return NotFound(new { error = exception.Message });
        }
        catch (TagConflictException exception)
        {
            return Conflict(new { error = exception.Message });
        }
    }
}

public sealed record TagRequest(string Name);
