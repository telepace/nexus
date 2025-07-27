// Health check endpoint for Frontend service
// This endpoint is used by Railway for health monitoring

export async function GET() {
  return Response.json(
    { 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'frontend',
      uptime: process.uptime()
    },
    { status: 200 }
  );
}