using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using LiveBPM.Web;
using LiveBPM.Web.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

var apiBaseUrl = builder.Configuration["ApiBaseUrl"]
    ?? throw new InvalidOperationException("ApiBaseUrl is not configured.");

var apiBaseAddress = new Uri(new Uri(builder.HostEnvironment.BaseAddress), apiBaseUrl);

builder.Services.AddHttpClient<TodoService>(client => client.BaseAddress = apiBaseAddress);

await builder.Build().RunAsync();
