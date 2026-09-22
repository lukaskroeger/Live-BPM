# Stage 1: Build Tailwind CSS
FROM node:20-alpine AS css-build
WORKDIR /src
COPY src/LiveBPM.Web/package.json ./
RUN npm install
COPY src/LiveBPM.Web/ ./
RUN npx @tailwindcss/cli -i ./tailwind.css -o ./wwwroot/tailwindStyles.css --minify

# Stage 2: Build Blazor WebAssembly
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["src/LiveBPM.Web/LiveBPM.Web.csproj", "src/LiveBPM.Web/"]
RUN dotnet restore "src/LiveBPM.Web/LiveBPM.Web.csproj"

COPY . .
COPY --from=css-build /src/wwwroot/tailwindStyles.css src/LiveBPM.Web/wwwroot/tailwindStyles.css

WORKDIR "/src/src/LiveBPM.Web"
RUN dotnet publish "LiveBPM.Web.csproj" -c Release -o /app/publish

# Stage 3: Serve with nginx
FROM nginx:alpine AS final

COPY src/LiveBPM.Web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/publish/wwwroot /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
