import { Card, CardContent } from '@/components/ui/card';

interface TaxBucketsCardProps {
  taxResult: null;
}

export function TaxBucketsCard({ taxResult }: TaxBucketsCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No hay datos fiscales disponibles</p>
      </CardContent>
    </Card>
  );
}
