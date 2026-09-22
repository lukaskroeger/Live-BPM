namespace LiveBPM.Domain.Entities;

/// <summary>
/// A sample entity that demonstrates the domain conventions.
/// Represents a simple todo item tracked by the system.
/// </summary>
public class TodoItem
{
    /// <summary>Database primary key.</summary>
    public int Id { get; set; }

    /// <summary>Short title of the todo item.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Optional detailed description.</summary>
    public string? Description { get; set; }

    /// <summary>Current status of the item.</summary>
    public TodoItemStatus Status { get; set; }

    /// <summary>Timestamp when the item was created.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Timestamp of the last update, if any.</summary>
    public DateTimeOffset? CompletedAt { get; set; }
}
