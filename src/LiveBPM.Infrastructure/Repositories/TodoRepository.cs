using Microsoft.EntityFrameworkCore;
using LiveBPM.Application.Common.Interfaces;
using LiveBPM.Domain.Entities;
using LiveBPM.Infrastructure.Persistence;

namespace LiveBPM.Infrastructure.Repositories;

public sealed class TodoRepository(AppDbContext context) : ITodoRepository
{
    public async Task<IReadOnlyList<TodoItem>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await context.TodoItems
            .AsNoTracking()
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<TodoItem?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await context.TodoItems
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
    }

    public async Task<TodoItem> AddAsync(TodoItem todo, CancellationToken cancellationToken = default)
    {
        await context.TodoItems.AddAsync(todo, cancellationToken);
        return todo;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await context.SaveChangesAsync(cancellationToken);
    }
}
