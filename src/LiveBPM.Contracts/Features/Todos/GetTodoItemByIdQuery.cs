using MediatR;

namespace LiveBPM.Contracts.Features.Todos;

public sealed record GetTodoItemByIdQuery(int Id) : IRequest<TodoItemDto?>;
