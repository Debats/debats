import Link from 'next/link'

export default function Page() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Bienvenue sur Débats.co</h1>
      <p className="text-lg text-gray-600 mb-8">
        Une synthèse ouverte, impartiale et vérifiable des sujets clivants de notre société.
      </p>
      
      <div className="space-y-4">
        <Link 
          href="/s" 
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Voir les sujets de débat
        </Link>
      </div>
    </div>
  );
}