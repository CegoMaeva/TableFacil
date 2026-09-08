using System.Collections.Concurrent;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// In-memory store for demo purposes
var items = new ConcurrentDictionary<Guid, Item>();

app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "inventory-csharp" }));

app.MapPost("/inventory/items", ([FromBody] ItemCreate payload) =>
{
    var item = new Item
    {
        Id = Guid.NewGuid(),
        Name = payload.Name,
        Category = payload.Category,
        Unit = payload.Unit ?? "unit",
        Stock = payload.Stock,
        MinThreshold = payload.MinThreshold,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };
    items[item.Id] = item;
    return Results.Created($"/inventory/items/{item.Id}", item);
});

app.MapGet("/inventory/items", () => Results.Ok(items.Values.OrderByDescending(x => x.CreatedAt)));

app.MapPatch("/inventory/items/{id:guid}/stock", ([FromRoute] Guid id, [FromBody] StockUpdate payload) =>
{
    if (!items.TryGetValue(id, out var item))
        return Results.NotFound(new { error = "Item not found" });

    var newStock = item.Stock + payload.Delta;
    if (newStock < 0)
        return Results.BadRequest(new { error = "Stock cannot be negative" });

    item.Stock = newStock;
    item.UpdatedAt = DateTime.UtcNow;
    items[id] = item;
    return Results.Ok(item);
});

app.MapGet("/inventory/low-stock", () => Results.Ok(items.Values.Where(x => x.Stock <= x.MinThreshold)));

app.Run();

record Item
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Category { get; init; }
    public string Unit { get; set; } = "unit";
    public int Stock { get; set; }
    public int MinThreshold { get; set; } = 5;
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; set; }
}

record ItemCreate
{
    public string Name { get; init; } = string.Empty;
    public string? Category { get; init; }
    public string Unit { get; init; } = "unit";
    public int Stock { get; init; } = 0;
    public int MinThreshold { get; init; } = 5;
}

record StockUpdate
{
    public int Delta { get; init; }
    public string? Note { get; init; }
}
