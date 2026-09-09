using Microsoft.AspNetCore.Mvc;

namespace Toolbox.Api.Controllers;

[ApiController]
[Route("api/status")]
public sealed class StatusController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new
    {
        name = "Toolbox",
        version = "0.1.0",
        stage = "foundation"
    });
}
