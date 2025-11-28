import { useQuery } from '@tanstack/react-query';
import { useContext } from 'react';
import AppContext from '../contexts/AppContext';

const RSS_SOURCES = {
  techcrunch: {
    id: 'techcrunch',
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'Technology'
  },
  theverge: {
    id: 'theverge',
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    category: 'Technology'
  },
  wired: {
    id: 'wired',
    name: 'Wired',
    url: 'https://www.wired.com/feed/rss',
    category: 'Technology'
  },
  bbc_news: {
    id: 'bbc_news',
    name: 'BBC News',
    url: 'http://feeds.bbci.co.uk/news/rss.xml',
    category: 'General'
  },
  nytimes: {
    id: 'nytimes',
    name: 'NY Times',
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
    category: 'General'
  }
};

export const useNewsRSS = () => {
  const { data } = useContext(AppContext);
  const selectedSourceId = data.selectedRssSource || 'techcrunch';
  const source = RSS_SOURCES[selectedSourceId] || RSS_SOURCES.techcrunch;

  const { data: news = [], isLoading, error, refetch } = useQuery({
    queryKey: ['news', selectedSourceId],
    queryFn: async () => {
      // Usiamo un proxy CORS pubblico per demo (in prod servirebbe un backend proxy)
      const CORS_PROXY = "https://api.allorigins.win/get?url=";
      const response = await fetch(`${CORS_PROXY}${encodeURIComponent(source.url)}`);
      const json = await response.json();

      if (!json.contents) throw new Error('Nessun contenuto ricevuto');

      const parser = new DOMParser();
      const xml = parser.parseFromString(json.contents, "text/xml");
      const items = Array.from(xml.querySelectorAll("item")).slice(0, 5);

      return items.map(item => ({
        title: item.querySelector("title")?.textContent || '',
        link: item.querySelector("link")?.textContent || '',
        pubDate: item.querySelector("pubDate")?.textContent || '',
        description: item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, '').slice(0, 100) + '...' || '',
        source: source.name
      }));
    },
    staleTime: 1000 * 60 * 15, // 15 min
    retry: 2
  });

  return {
    news,
    loading: isLoading,
    error,
    refreshNews: refetch,
    sources: Object.values(RSS_SOURCES),
    currentSource: source
  };
};