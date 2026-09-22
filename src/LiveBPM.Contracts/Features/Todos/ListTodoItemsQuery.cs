using MediatR;

namespace LiveBPM.Contracts.Features.Todos;

public sealed record ListTodoItemsQuery : IRequest<IReadOnlyList<TodoItemDto>>;
