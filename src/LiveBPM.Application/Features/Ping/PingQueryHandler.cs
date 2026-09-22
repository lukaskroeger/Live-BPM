using MediatR;
using LiveBPM.Contracts.Features.Ping;

namespace LiveBPM.Application.Features.Ping;

public sealed class PingQueryHandler : IRequestHandler<PingQuery, PingResponse>
{
    public Task<PingResponse> Handle(PingQuery query, CancellationToken cancellationToken)
    {
        var echo = string.IsNullOrWhiteSpace(query.Message)
            ? "pong"
            : $"pong: {query.Message.Trim()}";

        return Task.FromResult(new PingResponse(echo, DateTimeOffset.UtcNow));
    }
}
