namespace LiveBPM.Application.Common.Interfaces;

/// <summary>
/// Persistence port for <see cref="TodoItem"/> aggregates.
/// </summary>
public interface ITodoRepository
{
    Task<IReadOnlyList<TodoItem>> ListAsync(CancellationToken cancellationToken = default);
    Task<TodoItem?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<TodoItem> AddAsync(TodoItem todo, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
