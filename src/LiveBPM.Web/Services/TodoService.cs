using System.Net.Http.Json;
using LiveBPM.Contracts.Features.Todos;

namespace LiveBPM.Web.Services;

public sealed class TodoService(HttpClient http)
{
    public async Task<IReadOnlyList<TodoItemDto>> GetTodosAsync(
        CancellationToken cancellationToken = default)
    {
        var response = await http.GetFromJsonAsync<TodoItemDto[]>("api/todos", cancellationToken);
        return response?.ToList() ?? [];
    }

    public async Task<CreateTodoItemResponse?> CreateAsync(
        CreateTodoItemCommand command,
        CancellationToken cancellationToken = default)
    {
        var response = await http.PostAsJsonAsync("api/todos", command, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<CreateTodoItemResponse>(cancellationToken);
    }
}
