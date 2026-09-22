using MediatR;
using LiveBPM.Contracts.Features.Todos;

namespace LiveBPM.Application.Features.Todos;

public sealed class GetTodoItemByIdQueryHandler(ITodoRepository repository)
    : IRequestHandler<GetTodoItemByIdQuery, TodoItemDto?>
{
    public async Task<TodoItemDto?> Handle(
        GetTodoItemByIdQuery query,
        CancellationToken cancellationToken)
    {
        var todo = await repository.GetByIdAsync(query.Id, cancellationToken);

        if (todo is null)
            return null;

        return new TodoItemDto(
            todo.Id,
            todo.Title,
            todo.Description,
            todo.Status.ToString(),
            todo.CreatedAt,
            todo.CompletedAt);
    }
}
