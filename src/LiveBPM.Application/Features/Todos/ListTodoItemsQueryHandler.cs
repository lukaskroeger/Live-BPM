using MediatR;
using LiveBPM.Contracts.Features.Todos;

namespace LiveBPM.Application.Features.Todos;

public sealed class ListTodoItemsQueryHandler(ITodoRepository repository)
    : IRequestHandler<ListTodoItemsQuery, IReadOnlyList<TodoItemDto>>
{
    public async Task<IReadOnlyList<TodoItemDto>> Handle(
        ListTodoItemsQuery query,
        CancellationToken cancellationToken)
    {
        var todos = await repository.ListAsync(cancellationToken);

        return todos
            .Select(t => new TodoItemDto(
                t.Id,
                t.Title,
                t.Description,
                t.Status.ToString(),
                t.CreatedAt,
                t.CompletedAt))
            .ToList();
    }
}
