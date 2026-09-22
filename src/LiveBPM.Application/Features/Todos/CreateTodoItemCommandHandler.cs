using MediatR;
using LiveBPM.Contracts.Features.Todos;

namespace LiveBPM.Application.Features.Todos;

public sealed class CreateTodoItemCommandHandler(ITodoRepository repository)
    : IRequestHandler<CreateTodoItemCommand, CreateTodoItemResponse>
{
    public async Task<CreateTodoItemResponse> Handle(
        CreateTodoItemCommand command,
        CancellationToken cancellationToken)
    {
        var todo = new TodoItem
        {
            Title = command.Title.Trim(),
            Description = command.Description?.Trim(),
            Status = TodoItemStatus.NotStarted,
            CreatedAt = DateTimeOffset.UtcNow
        };

        await repository.AddAsync(todo, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);

        return new CreateTodoItemResponse(todo.Id, todo.Title, todo.Status.ToString(), todo.CreatedAt);
    }
}
