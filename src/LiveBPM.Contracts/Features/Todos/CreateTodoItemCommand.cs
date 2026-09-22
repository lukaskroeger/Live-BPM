using MediatR;

namespace LiveBPM.Contracts.Features.Todos;

public sealed record CreateTodoItemCommand(string Title, string? Description = null)
    : IRequest<CreateTodoItemResponse>;

public sealed record CreateTodoItemResponse(int Id, string Title, string Status, DateTimeOffset CreatedAt);
