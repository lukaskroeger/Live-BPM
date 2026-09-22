FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

COPY ["src/LiveBPM.Api/LiveBPM.Api.csproj", "src/LiveBPM.Api/"]
COPY ["src/LiveBPM.Application/LiveBPM.Application.csproj", "src/LiveBPM.Application/"]
COPY ["src/LiveBPM.Domain/LiveBPM.Domain.csproj", "src/LiveBPM.Domain/"]
COPY ["src/LiveBPM.Infrastructure/LiveBPM.Infrastructure.csproj", "src/LiveBPM.Infrastructure/"]
RUN dotnet restore "src/LiveBPM.Api/LiveBPM.Api.csproj"

COPY . .
WORKDIR "/src/src/LiveBPM.Api"
RUN dotnet build "LiveBPM.Api.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "LiveBPM.Api.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "LiveBPM.Api.dll"]
