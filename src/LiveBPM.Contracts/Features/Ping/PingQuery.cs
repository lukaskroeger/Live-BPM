using MediatR;

namespace LiveBPM.Contracts.Features.Ping;

public sealed record PingQuery(string? Message = null) : IRequest<PingResponse>;

public sealed record PingResponse(string Echo, DateTimeOffset Timestamp);
