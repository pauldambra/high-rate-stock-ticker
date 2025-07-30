import StockTicker from '@/components/StockTicker';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const mutationRateParam = params.mutationRate;

  // Parse mutation rate with validation
  let mutationRate: number | undefined;
  if (typeof mutationRateParam === 'string') {
    const parsed = parseInt(mutationRateParam, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 1000) {
      mutationRate = parsed;
    }
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <StockTicker mutationRate={mutationRate} />
    </main>
  );
}
