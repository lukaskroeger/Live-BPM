using MediatR;
using Microsoft.AspNetCore.Mvc;
using LiveBPM.Contracts.Features.Ping;

namespace LiveBPM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PingController(ISender sender) : ControllerBase
{
    /// <summary>
    /// Echo endpoint used by the livebpm smoke tests.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PingResponse>> Get([FromQuery] string? message, CancellationToken cancellationToken)
    {
        var response = await sender.Send(new PingQuery(message), cancellationToken);
        return Ok(response);
    }
}
