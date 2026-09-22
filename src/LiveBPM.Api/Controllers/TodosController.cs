using MediatR;
using Microsoft.AspNetCore.Mvc;
using LiveBPM.Contracts.Features.Todos;

namespace LiveBPM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TodosController(ISender sender) : ControllerBase
{
    /// <summary>
    /// Returns all todo items ordered by creation date descending.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TodoItemDto>>> GetAll(CancellationToken cancellationToken)
    {
        var response = await sender.Send(new ListTodoItemsQuery(), cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// Returns a single todo item by id.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<TodoItemDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var response = await sender.Send(new GetTodoItemByIdQuery(id), cancellationToken);
        return response is null ? NotFound() : Ok(response);
    }

    /// <summary>
    /// Creates a new todo item.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<CreateTodoItemResponse>> Create(
        [FromBody] CreateTodoItemCommand command,
        CancellationToken cancellationToken)
    {
        var response = await sender.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = response.Id }, response);
    }
}
