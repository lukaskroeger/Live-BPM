namespace LiveBPM.Contracts.Features.Todos;

public sealed record TodoItemDto(
    int Id,
    string Title,
    string? Description,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? CompletedAt);
