/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Info, 
  Map as MapIcon, 
  Table as TableIcon, 
  BookOpen, 
  User, 
  Globe,
  X,
  ChevronRight,
  ChevronDown,
  Filter,
  Download,
  Plus,
  Edit2,
  Trash2,
  Save,
  RotateCcw,
  Settings,
  ExternalLink,
  MessageSquare,
  Send,
  BarChart3
} from 'lucide-react';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { AFRICA_DATA, CountryData, TableHeaders } from './data';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ISO3_TO_ISO2: Record<string, string> = {
  'ZAF': 'za', 'DZA': 'dz', 'AGO': 'ao', 'BEN': 'bj', 'BWA': 'bw', 'BFA': 'bf', 'BDI': 'bi', 'CMR': 'cm',
  'CPV': 'cv', 'COM': 'km', 'COG': 'cg', 'CIV': 'ci', 'DJI': 'dj', 'EGY': 'eg', 'ERI': 'er', 'SWZ': 'sz',
  'ETH': 'et', 'GAB': 'ga', 'GMB': 'gm', 'GHA': 'gh', 'GIN': 'gn', 'GNQ': 'gq', 'GNB': 'gw', 'KEN': 'ke',
  'LSO': 'ls', 'LBR': 'lr', 'LBY': 'ly', 'MDG': 'mg', 'MWI': 'mw', 'MLI': 'ml', 'MAR': 'ma', 'MUS': 'mu',
  'MRT': 'mr', 'MOZ': 'mz', 'NAM': 'na', 'NER': 'ne', 'NGA': 'ng', 'UGA': 'ug', 'COD': 'cd', 'CAF': 'cf',
  'RWA': 'rw', 'ESH': 'eh', 'STP': 'st', 'SEN': 'sn', 'SYC': 'sc', 'SLE': 'sl', 'SOM': 'so', 'SDN': 'sd',
  'SSD': 'ss', 'TZA': 'tz', 'TCD': 'td', 'TGO': 'tg', 'TUN': 'tn', 'ZMB': 'zm', 'ZWE': 'zw'
};

const getFlagUrl = (iso3: string) => {
  const iso2 = ISO3_TO_ISO2[iso3.toUpperCase()];
  if (!iso2) return null;
  return `https://flagcdn.com/w40/${iso2}.png`;
};

const getEmojiFlag = (iso3: string) => {
  const iso2 = ISO3_TO_ISO2[iso3.toUpperCase()];
  if (!iso2) return '';
  return String.fromCodePoint(...[...iso2.toUpperCase()].map(c => c.charCodeAt(0) + 127397));
};

// Map Component
const AfricaMap = ({ 
  onCountryClick, 
  selectedCountryId,
  data,
  headers,
  setEditingHeaders,
  setIsHeaderModalOpen
}: { 
  onCountryClick: (country: CountryData | null) => void;
  selectedCountryId: string | null;
  data: CountryData[];
  headers: TableHeaders;
  setEditingHeaders: (headers: TableHeaders) => void;
  setIsHeaderModalOpen: (open: boolean) => void;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observeTarget = containerRef.current;
    if (!observeTarget) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    resizeObserver.observe(observeTarget);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
      .then(response => response.json())
      .then(geoJson => {
        // Use the full list of IDs from AFRICA_DATA to ensure all countries are always drawn
        const africanIsoCodes = AFRICA_DATA.map(d => d.id);
        // Fallback for common ID variations
        const idMap: Record<string, string> = {
          'SDS': 'SSD',
          'SS': 'SSD',
          'SZL': 'SWZ',
          'ZAR': 'COD',
          'DRC': 'COD',
          'KM': 'COM',
          'MU': 'MUS',
          'SC': 'SYC',
          'CV': 'CPV',
          'ST': 'STP',
          'REU': 'REU', // Reunion (if added)
          'MYT': 'COM'  // Mayotte
        };
        const africa = {
          ...geoJson,
          features: geoJson.features.filter((f: any) => {
            const id = idMap[f.id] || f.id;
            return africanIsoCodes.includes(id);
          }).map((f: any) => ({
            ...f,
            id: idMap[f.id] || f.id // Normalize ID
          }))
        };
        setGeoData(africa);
      });
  }, [data]);

  useEffect(() => {
    if (!geoData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = dimensions.width || svgRef.current.clientWidth;
    const height = dimensions.height || svgRef.current.clientHeight;

    if (width === 0 || height === 0) return;

    // Use fitSize to ensure the entire continent fits perfectly in the frame with padding
    const projection = d3.geoMercator()
      .fitExtent([[10, 10], [width - 10, height - 10]], geoData);

    const path = d3.geoPath().projection(projection);

    const g = svg.append('g');

    // Draw countries
    g.selectAll('path')
      .data(geoData.features)
      .enter()
      .append('path')
      .attr('d', path as any)
      .attr('class', (d: any) => {
        const isSelected = selectedCountryId === d.id;
        return cn(
          'transition-all duration-300 cursor-pointer stroke-white hover:stroke-slate-400',
          isSelected ? 'stroke-slate-600 stroke-2 animate-blink-red' : 'stroke-1'
        );
      })
      .attr('fill', (d: any) => {
        const country = data.find(c => c.id === d.id);
        if (!country) return '#f1f5f9'; // Muted slate 100 for non-filtered countries
        switch (country.status) {
          case 'COMPLETE': return '#93c5fd'; // Soft Blue
          case 'NO_EPOCH': return '#fde047'; // Soft Yellow
          case 'MISSING_INFO': return '#fca5a5'; // Soft Red
          case 'LOCAL_NETWORK': return '#c084fc'; // Soft Purple
          case 'ACTIVE': return '#cbd5e1'; // Soft Slate
          default: return '#f1f5f9';
        }
      })
      .attr('opacity', (d: any) => {
        const country = data.find(c => c.id === d.id);
        return country ? 1 : 0.3; // More transparent for non-filtered countries
      })
      .on('click', (event, d: any) => {
        const country = data.find(c => c.id === d.id);
        onCountryClick(country || null);
      })
      .append('title')
      .text((d: any) => d.properties.name);

    // Add country names
    g.selectAll('text')
      .data(geoData.features)
      .enter()
      .append('text')
      .attr('transform', (d: any) => {
        const centroid = path.centroid(d);
        return `translate(${centroid[0]}, ${centroid[1]})`;
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', width < 500 ? '6px' : '8px')
      .attr('font-weight', '700')
      .attr('fill', '#000000')
      .attr('pointer-events', 'none')
      .text((d: any) => {
        const country = data.find(c => c.id === d.id);
        if (!country) return '';
        const flag = getEmojiFlag(country.id);
        return `${flag} ${country.country}`;
      });

    // Add circles for small islands to make them more visible
    const islandIds = ['CPV', 'COM', 'MUS', 'SYC', 'STP'];
    
    // Manual coordinates for islands that might be missing or too small in GeoJSON
    const manualIslands = [
      { id: 'MUS', name: 'Mauritius', coords: [57.5522, -20.3484] },
      { id: 'SYC', name: 'Seychelles', coords: [55.4920, -4.6796] },
      { id: 'COM', name: 'Comoros', coords: [43.3333, -11.6450] },
      { id: 'CPV', name: 'Cape Verde', coords: [-23.0418, 16.0020] },
      { id: 'STP', name: 'Sao Tome and Principe', coords: [6.7333, 0.1864] }
    ];

    const islandMarkers = g.selectAll('.island-marker')
      .data(manualIslands)
      .enter()
      .append('g')
      .attr('class', 'island-marker cursor-pointer transition-all duration-300')
      .on('click', (event, d: any) => {
        const country = data.find(c => c.id === d.id);
        onCountryClick(country || null);
      });

    islandMarkers.append('circle')
      .attr('cx', (d: any) => projection(d.coords as [number, number])![0])
      .attr('cy', (d: any) => projection(d.coords as [number, number])![1])
      .attr('r', 5)
      .attr('fill', (d: any) => {
        const country = data.find(c => c.id === d.id);
        if (!country) return '#f8fafc';
        switch (country.status) {
          case 'COMPLETE': return '#93c5fd';
          case 'NO_EPOCH': return '#fde047';
          case 'MISSING_INFO': return '#fca5a5';
          case 'LOCAL_NETWORK': return '#c084fc';
          case 'ACTIVE': return '#cbd5e1';
          default: return '#f1f5f9';
        }
      })
      .attr('opacity', (d: any) => {
        const country = data.find(c => c.id === d.id);
        return country ? 1 : 0.2;
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('class', (d: any) => {
        const isSelected = selectedCountryId === d.id;
        return cn(
          isSelected ? 'stroke-slate-600 stroke-2 animate-blink-red' : ''
        );
      });

    islandMarkers.append('text')
      .attr('x', (d: any) => projection(d.coords as [number, number])![0])
      .attr('y', (d: any) => projection(d.coords as [number, number])![1] - 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', width < 500 ? '5px' : '7px')
      .attr('font-weight', '800')
      .attr('fill', '#000000')
      .attr('pointer-events', 'none')
      .text((d: any) => {
        const flag = getEmojiFlag(d.id);
        return `${flag} ${d.name}`;
      });

  }, [geoData, selectedCountryId, onCountryClick, data, dimensions]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col">
      <div className="py-2 px-4 border-b border-slate-100 bg-slate-50/50 flex justify-center items-center">
        <h2 className="text-[9px] sm:text-[11px] md:text-sm font-black text-slate-900 uppercase tracking-[0.2em] text-center">
          CARTOGRAPHY OF REFERENCE SYSTEMS IN AFRICA
        </h2>
      </div>
      
      <div className="relative flex-1 overflow-hidden">
        <svg ref={svgRef} className="w-full h-full" />
        
        {/* Draggable Statistical Summary Overlay - Always Visible */}
        <motion.div 
          drag
          dragConstraints={containerRef}
          dragMomentum={false}
          className={cn(
            "absolute z-20 bg-white/95 backdrop-blur-md p-2 sm:p-3 rounded-xl border border-slate-200 text-[8px] sm:text-[10px] text-slate-700 shadow-lg cursor-move active:shadow-2xl transition-shadow",
            dimensions.width < 640 ? "top-2 right-2" : "top-4 right-4 min-w-[150px]"
          )}
        >
          <div className="font-black mb-1.5 text-indigo-900 uppercase tracking-wider border-b border-indigo-100 pb-1 flex items-center justify-between">
            <span>Statistics</span>
            <div className="flex flex-col gap-0.5">
              <div className="w-2.5 h-0.5 bg-slate-300 rounded-full" />
              <div className="w-2.5 h-0.5 bg-slate-300 rounded-full" />
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-slate-400 text-left">
                <th className="font-black uppercase pb-1">Status</th>
                <th className="font-black uppercase pb-1 text-right">Qty</th>
                <th className="font-black uppercase pb-1 text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[
                { label: 'ITRF with Epoch', status: 'COMPLETE', color: 'bg-[#93c5fd]' },
                { label: 'ITRF without Epoch', status: 'NO_EPOCH', color: 'bg-[#fde047]' },
                { label: 'Missing Info', status: 'MISSING_INFO', color: 'bg-[#fca5a5]' },
                { label: 'Local Network', status: 'LOCAL_NETWORK', color: 'bg-[#c084fc]' }
              ].map((item) => {
                const count = data.filter(c => c.status === item.status).length;
                const percentage = data.length > 0 ? ((count / data.length) * 100).toFixed(1) : 0;
                return (
                  <tr key={item.status} className="group">
                    <td className="py-0.5 flex items-center gap-1">
                      <div className={cn("w-1 h-1 rounded-full", item.color)} />
                      <span className="font-medium">{item.label}</span>
                    </td>
                    <td className="py-0.5 text-right font-mono font-bold text-slate-900">{count}</td>
                    <td className="py-0.5 text-right font-mono text-slate-500">{percentage}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>

        {/* Draggable Legend Overlay - Always Visible, Fixed Bottom Left */}
        <motion.div 
          drag
          dragConstraints={containerRef}
          dragMomentum={false}
          className={cn(
            "absolute z-20 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md p-2 sm:p-3 rounded-xl border border-slate-200 text-[8px] sm:text-[10px] text-slate-700 shadow-lg cursor-move active:shadow-2xl transition-shadow",
            dimensions.width < 640 ? "bottom-2 left-2" : "bottom-4 left-4"
          )}
        >
          <div className="font-black mb-1 text-indigo-900 uppercase tracking-wider flex items-center justify-between">
            <span>Legend</span>
            <div className="flex flex-col gap-0.5">
              <div className="w-2.5 h-0.5 bg-slate-300 rounded-full" />
              <div className="w-2.5 h-0.5 bg-slate-300 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#93c5fd] border border-blue-400" />
            <span>ITRF with Epoch</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#fde047] border border-yellow-400" />
            <span>ITRF without Epoch</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#fca5a5] border border-red-400" />
            <span>Missing Info</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#c084fc] border border-purple-400" />
            <span>Local Network</span>
          </div>
        </motion.div>

        {/* Draggable Credits Overlay - Always Visible, Fixed Bottom Right */}
        <motion.div 
          drag
          dragConstraints={containerRef}
          dragMomentum={false}
          className={cn(
            "absolute z-20 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md p-2 sm:p-3 rounded-xl border border-slate-200 text-[8px] sm:text-[9px] text-slate-700 shadow-lg cursor-move active:shadow-2xl transition-shadow",
            dimensions.width < 640 ? "bottom-2 right-2" : "bottom-4 right-4"
          )}
        >
          <div className="font-black mb-1 text-indigo-900 uppercase tracking-wider flex items-center justify-between gap-2">
            <span>Authors</span>
            <div className="flex flex-col gap-0.5">
              <div className="w-2.5 h-0.5 bg-slate-300 rounded-full" />
              <div className="w-2.5 h-0.5 bg-slate-300 rounded-full" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <User size={10} className="text-indigo-600" />
              <span className="font-bold text-slate-900">W. B. E. PLEI</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User size={10} className="text-indigo-600" />
              <span className="font-bold text-slate-900">E. H. A. A. SALL</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default function App() {
  const [countries, setCountries] = useState<CountryData[]>(AFRICA_DATA);
  const [headers, setHeaders] = useState<TableHeaders>({
    country: 'Country',
    formerNetwork: 'Former Network',
    currentNetwork: 'Current Network',
    itrf: 'ITRF',
    epoch: 'Epoch',
    status: 'Status'
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load data from server
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/data');
        if (response.ok) {
          const data = await response.json();
          if (data.countries) {
            setCountries(data.countries);
          } else {
            // If server has no data, initialize it with current AFRICA_DATA
            await fetch('/api/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ countries: AFRICA_DATA, headers })
            });
          }
          if (data.headers) setHeaders(data.headers);
        }
      } catch (error) {
        console.error("Failed to fetch data from server:", error);
        // Fallback to localStorage if server fails
        const savedData = localStorage.getItem('geodetic_data');
        const savedHeaders = localStorage.getItem('table_headers');
        if (savedData) setCountries(JSON.parse(savedData));
        if (savedHeaders) setHeaders(JSON.parse(savedHeaders));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Persist to localStorage as backup
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('geodetic_data', JSON.stringify(countries));
    }
  }, [countries, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('table_headers', JSON.stringify(headers));
    }
  }, [headers, isLoading]);

  const handleSaveAll = async () => {
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countries, headers })
      });
      
      if (response.ok) {
        localStorage.setItem('geodetic_data', JSON.stringify(countries));
        localStorage.setItem('table_headers', JSON.stringify(headers));
        alert("All changes have been successfully saved to the database!");
      } else {
        throw new Error("Server response was not ok");
      }
    } catch (error) {
      console.error("Failed to save data to server:", error);
      // Fallback save to localStorage
      localStorage.setItem('geodetic_data', JSON.stringify(countries));
      localStorage.setItem('table_headers', JSON.stringify(headers));
      alert("Error saving to server. Data has been saved locally in your browser.");
    }
  };

  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'map' | 'table' | 'chat' | 'filter' | 'sources'>('map');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    itrf: '',
    status: '',
    country: '',
    zone: ''
  });
  const [editingCountry, setEditingCountry] = useState<Partial<CountryData> | null>(null);
  const [editingHeaders, setEditingHeaders] = useState<TableHeaders>(headers);

  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const model = "gemini-3-flash-preview";
      
      const systemInstruction = `You are a high-level Geodetic Engineer and Data Scientist working on the project 'PRT M2 - DYNAMICS OF GEODETIC REFERENCE FRAMES IN AFRICA'. Do NOT present yourself as an AI or an assistant. Speak directly as the expert in charge.
      
      KNOWLEDGE BASE & SOURCES:
      You have access to several critical sources of information. You must perform deep keyword searches within these sources to find the most accurate and exhaustive information:
      1. Dashboard Real-time Data:
      ${countries.map(c => `${c.country} (${c.zone}): ITRF ${c.itrf || 'N/A'}, Epoch ${c.epoch || 'N/A'}, Status ${c.status}`).join('\n')}
      
      2. Technical Documentation & Specialized Gems:
      - https://notebooklm.google.com/notebook/574afb8b-3d81-43b8-979d-817da2fa56b5?authuser=1
      - https://notebooklm.google.com/notebook/7168590f-d36f-426b-9f54-382eea234d8b?authuser=1
      - https://gemini.google.com/gem/16JxV9AuvyKjeBaV35kb_mtoD9PGcOJEh?usp=drive_link
      
      RESPONSE GUIDELINES:
      - DEEP SEARCH: Focus on finding the exact keywords and concepts requested. Dig deep into the technical details.
      - EXHAUSTIVENESS: Provide detailed, comprehensive, and exhaustive explanations. Go into depth for every topic.
      - ORGANIZATION: Use a clear structure with headings, bullet points, and numbered lists.
      - NO SOURCE CITATIONS: Do NOT explicitly list or name the sources (like "Partie 1", "Notebook", or URLs) in your response. Provide the information directly as your own expert knowledge.
      - TRUTHFULNESS: Be truthful and precise. If information is missing from all sources, state that it is not available in the current technical documentation.
      
      YOUR ROLE:
      - Provide technical analysis of geodetic reference frames in Africa.
      - Explain concepts like ITRF, AFREF, and epochs as described in the sources.
      - Help users interpret the data from the dashboard and the technical documents.
      
      LANGUAGE:
      - ALWAYS respond in English, even if the user asks questions in French or any other language.
      - Use technical terminology correctly (e.g., 'reference frame', 'epoch', 'CORS station').`;

      const response = await ai.models.generateContent({
        model,
        contents: [
          ...chatMessages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction,
          tools: [{ urlContext: {} }, { googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        }
      });

      const modelResponse = response.text || "I'm sorry, I couldn't process that request.";
      setChatMessages(prev => [...prev, { role: 'model', text: modelResponse }]);
    } catch (error) {
      console.error("Chat Error:", error);
      setChatMessages(prev => [...prev, { role: 'model', text: "Sorry, an error occurred while communicating with the assistant." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const mapContainerRef = useRef<HTMLDivElement>(null);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(countries.map(c => ({
      'Country': c.country,
      'Former Network': c.formerNetwork,
      'Current Network': c.currentNetwork,
      'ITRF': c.itrf,
      'Epoch': c.epoch,
      'Status': c.status
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Geodetic Data");
    XLSX.writeFile(wb, "Geodesie_Afrique.xlsx");
  };

  const exportMapAsImage = async () => {
    if (mapContainerRef.current === null) return;
    try {
      const dataUrl = await toPng(mapContainerRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = 'Carte_Geodesie_Afrique.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('oops, something went wrong!', err);
    }
  };

  const filteredData = useMemo(() => {
    return countries.filter(c => {
      const matchesSearch = searchQuery === '' || 
        c.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.itrf.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.currentNetwork && c.currentNetwork.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesItrf = filters.itrf === '' || c.itrf === filters.itrf;
      const matchesStatus = filters.status === '' || c.status === filters.status;
      const matchesCountry = filters.country === '' || c.country.toLowerCase().includes(filters.country.toLowerCase());
      const matchesZone = filters.zone === '' || c.zone === filters.zone;

      return matchesSearch && matchesItrf && matchesStatus && matchesCountry && matchesZone;
    });
  }, [searchQuery, countries, filters]);

  const handleSaveCountry = () => {
    if (!editingCountry?.id || !editingCountry?.country) {
      alert("ID and country name are required.");
      return;
    }

    const newCountries = [...countries];
    const index = newCountries.findIndex(c => c.id === editingCountry.id);

    if (index > -1) {
      newCountries[index] = editingCountry as CountryData;
    } else {
      newCountries.push(editingCountry as CountryData);
    }

    setCountries(newCountries);
    setIsEditModalOpen(false);
    setEditingCountry(null);
    if (selectedCountry?.id === editingCountry.id) {
      setSelectedCountry(editingCountry as CountryData);
    }
  };

  const handleDeleteCountry = (id: string) => {
    if (window.confirm("Are you sure you want to delete this country?")) {
      setCountries(countries.filter(c => c.id !== id));
      if (selectedCountry?.id === id) setSelectedCountry(null);
    }
  };

  const openEditModal = (country: CountryData | null = null) => {
    setEditingCountry(country ? { ...country } : {
      id: '',
      country: '',
      formerNetwork: '',
      currentNetwork: '',
      itrf: '',
      epoch: '',
      status: 'MISSING_INFO',
      zone: 'WEST'
    });
    setIsEditModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/90 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
              <div id="authors-section" className="text-center lg:text-left">
              <motion.h1 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-black uppercase leading-tight"
              >
                PRT M2 - DYNAMICS OF GEODETIC REFERENCE FRAMES IN AFRICA
              </motion.h1>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col mt-2 items-center lg:items-start"
              >
                <span className="text-[9px] sm:text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em] mb-1 text-center lg:text-left">AUTHORS</span>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 text-slate-600 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5">
                    <User size={12} className="text-indigo-600 sm:w-3.5 sm:h-3.5" />
                    <span>Wonbleon Brice Emery PLEI</span>
                  </div>
                  <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300" />
                  <div className="flex items-center gap-1.5">
                    <User size={12} className="text-indigo-600 sm:w-3.5 sm:h-3.5" />
                    <span>El Hadji Abdoul Aziz SALL</span>
                  </div>
                </div>
              </motion.div>
            </div>
            
            <div className="flex flex-col items-center lg:items-end gap-3">
              <div className="text-center w-full lg:w-auto">
                <span className="text-[9px] sm:text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] sm:tracking-[0.3em] bg-slate-50 px-3 py-1 rounded-full border border-slate-100 block lg:inline-block">
                  UNIVERSITÉ IBA DER THIAM DE THIÈS (UFR-SI)
                </span>
              </div>
              <nav className="flex flex-wrap justify-center bg-slate-100 p-1 rounded-xl border border-slate-200 w-full lg:w-auto">
              <button 
                onClick={() => setActiveTab('map')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === 'map' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                <MapIcon size={16} />
                Map
              </button>
              <button 
                onClick={() => setActiveTab('table')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === 'table' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                <TableIcon size={16} />
                Data
              </button>
              <button 
                onClick={() => setActiveTab('chat')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === 'chat' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                <MessageSquare size={16} />
                Chat Assistant
              </button>
              <button 
                onClick={() => window.open('https://www.fig.net/searchresults.asp?q=ITRF+SENEGAL+', '_blank')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                )}
              >
                <ExternalLink size={16} />
                FIG Sources
              </button>
              <div className="w-px h-6 bg-slate-200 mx-1 self-center" />
              <button 
                onClick={handleSaveAll}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-emerald-600 hover:bg-emerald-50"
                title="Save all changes"
              >
                <Save size={16} />
                Save
              </button>
            </nav>
          </div>
        </div>
      </div>
    </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'map' && (
            <motion.div 
              key="map-tab"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 lg:h-[calc(100vh-180px)]"
            >
              {/* Map Section */}
              <div className="lg:col-span-2 flex flex-col gap-4 h-[500px] sm:h-[600px] lg:h-full">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                    <Filter size={14} className="text-indigo-600" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zone:</span>
                    <select 
                      value={filters.zone}
                      onChange={(e) => setFilters({ ...filters, zone: e.target.value })}
                      className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="">All Zones</option>
                      <option value="NORTH">NORTH</option>
                      <option value="SOUTH">SOUTH</option>
                      <option value="EAST">EAST</option>
                      <option value="WEST">WEST</option>
                      <option value="CENTER">CENTER</option>
                    </select>
                  </div>
                  
                  <button 
                    onClick={exportMapAsImage}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95 ml-auto"
                  >
                    <Download size={14} className="sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Export Map Image (PNG)</span>
                    <span className="sm:hidden">Export</span>
                  </button>
                </div>
                <div className="relative flex-1" ref={mapContainerRef}>
                  <AfricaMap 
                    onCountryClick={setSelectedCountry} 
                    selectedCountryId={selectedCountry?.id || null} 
                    data={filteredData}
                    headers={headers}
                    setEditingHeaders={setEditingHeaders}
                    setIsHeaderModalOpen={setIsHeaderModalOpen}
                  />
                </div>
              </div>

              {/* Info Panel */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Info size={18} className="text-indigo-600" />
                    Country Details
                  </h2>
                  {selectedCountry && (
                    <button 
                      onClick={() => setSelectedCountry(null)}
                      className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                  {selectedCountry ? (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4 sm:space-y-6"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className={cn(
                          "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl shadow-sm",
                          selectedCountry.status === 'COMPLETE' ? "bg-blue-50 text-blue-600" :
                          selectedCountry.status === 'NO_EPOCH' ? "bg-yellow-50 text-yellow-600" :
                          selectedCountry.status === 'MISSING_INFO' ? "bg-red-50 text-red-600" :
                          selectedCountry.status === 'LOCAL_NETWORK' ? "bg-purple-50 text-purple-600" :
                          "bg-slate-50 text-slate-600"
                        )}>
                          <Globe size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight flex items-center gap-2">
                            {getFlagUrl(selectedCountry.id) && (
                              <img 
                                src={getFlagUrl(selectedCountry.id)!} 
                                alt="" 
                                className="w-6 h-auto rounded-sm shadow-sm border border-slate-100"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            {selectedCountry.country}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                              "text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full",
                              selectedCountry.status === 'COMPLETE' ? "bg-blue-100 text-blue-700" :
                              selectedCountry.status === 'NO_EPOCH' ? "bg-yellow-100 text-yellow-700" :
                              selectedCountry.status === 'MISSING_INFO' ? "bg-red-100 text-red-700" :
                              selectedCountry.status === 'LOCAL_NETWORK' ? "bg-purple-100 text-purple-700" :
                              "bg-slate-100 text-slate-700"
                            )}>
                              {selectedCountry.status.replace('_', ' ')}
                            </span>
                            <div className="flex gap-1 ml-auto">
                              <button 
                                onClick={() => openEditModal(selectedCountry)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteCountry(selectedCountry.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <InfoItem label={headers.formerNetwork} value={selectedCountry.formerNetwork} />
                        <InfoItem label={headers.currentNetwork} value={selectedCountry.currentNetwork} />
                        <InfoItem label={headers.itrf} value={selectedCountry.itrf} />
                        <InfoItem label={headers.epoch} value={selectedCountry.epoch} />
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                        <MapIcon size={32} className="text-slate-400" />
                      </div>
                      <p className="text-sm max-w-[200px] text-slate-500">
                        Click on a country on the map to see detailed information
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'table' && (
            <motion.div 
              key="table-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <BarChart3 size={20} className="text-indigo-600" />
                    Filtered Statistics
                  </h3>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Based on {filteredData.length} countries
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'ITRF with Epoch', status: 'COMPLETE', color: 'bg-blue-50 text-blue-700 border-blue-100' },
                    { label: 'ITRF without Epoch', status: 'NO_EPOCH', color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
                    { label: 'Missing Info', status: 'MISSING_INFO', color: 'bg-red-50 text-red-700 border-red-100' },
                    { label: 'Local Network', status: 'LOCAL_NETWORK', color: 'bg-purple-50 text-purple-700 border-purple-100' }
                  ].map((item) => {
                    const count = filteredData.filter(c => c.status === item.status).length;
                    const percentage = filteredData.length > 0 ? ((count / filteredData.length) * 100).toFixed(1) : 0;
                    return (
                      <div key={item.status} className={cn("p-4 rounded-2xl border transition-all", item.color)}>
                        <div className="text-[10px] font-black uppercase tracking-wider mb-1 opacity-70">{item.label}</div>
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-black leading-none">{count}</span>
                          <span className="text-xs font-bold opacity-60 mb-0.5">{percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Filter size={20} className="text-indigo-600" />
                    Advanced Filters
                  </h3>
                  <button 
                    onClick={() => setFilters({ itrf: '', status: '', country: '', zone: '' })}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <RotateCcw size={14} />
                    Reset Filters
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Country Name</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input 
                        type="text" 
                        value={filters.country}
                        onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                        placeholder="Search country..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ITRF Frame</label>
                    <select 
                      value={filters.itrf}
                      onChange={(e) => setFilters({ ...filters, itrf: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    >
                      <option value="">All Frames</option>
                      {Array.from(new Set(countries.map(c => c.itrf).filter(Boolean))).sort().map(itrf => (
                        <option key={itrf} value={itrf}>{itrf}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                    <select 
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    >
                      <option value="">All Statuses</option>
                      <option value="COMPLETE">ITRF with Epoch</option>
                      <option value="NO_EPOCH">ITRF without Epoch</option>
                      <option value="MISSING_INFO">Missing Information</option>
                      <option value="LOCAL_NETWORK">Local Network</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Zone</label>
                    <select 
                      value={filters.zone}
                      onChange={(e) => setFilters({ ...filters, zone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    >
                      <option value="">All Zones</option>
                      <option value="NORTH">NORTH</option>
                      <option value="SOUTH">SOUTH</option>
                      <option value="EAST">EAST</option>
                      <option value="WEST">WEST</option>
                      <option value="CENTER">CENTER</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="text-sm text-slate-500">
                  Showing <span className="font-bold text-slate-900">{filteredData.length}</span> countries
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-md"
                  >
                    <Download size={16} />
                    Export Excel
                  </button>
                  <button 
                    onClick={() => {
                      setEditingHeaders(headers);
                      setIsHeaderModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Settings size={16} />
                    Edit Headers
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{headers.country}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{headers.formerNetwork}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{headers.currentNetwork}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{headers.itrf}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{headers.epoch}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{headers.status}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredData.map((country) => (
                        <tr 
                          key={country.id}
                          className="hover:bg-slate-50 transition-colors group cursor-pointer"
                          onClick={() => {
                            setSelectedCountry(country);
                            setActiveTab('map');
                          }}
                        >
                          <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            <div className="flex items-center gap-2">
                              {getFlagUrl(country.id) && (
                                <img 
                                  src={getFlagUrl(country.id)!} 
                                  alt="" 
                                  className="w-5 h-auto rounded-sm border border-slate-100"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              {country.country}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                            {country.formerNetwork || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                            {country.currentNetwork || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-indigo-600">
                            {country.itrf || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-amber-600">
                            {country.epoch || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[10px] uppercase font-black tracking-tighter px-2 py-1 rounded-md",
                              country.status === 'COMPLETE' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                              country.status === 'NO_EPOCH' ? "bg-yellow-50 text-yellow-600 border border-yellow-100" :
                              country.status === 'MISSING_INFO' ? "bg-red-50 text-red-600 border border-red-100" :
                              country.status === 'LOCAL_NETWORK' ? "bg-purple-50 text-purple-600 border border-purple-100" :
                              "bg-slate-50 text-slate-600 border border-slate-100"
                            )}>
                              {country.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'filter' && (
            <motion.div 
              key="filter-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                      <Filter className="text-indigo-600" />
                      Advanced Filtering
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Refine the data displayed in the table and map</p>
                  </div>
                  <button 
                    onClick={() => setFilters({ itrf: '', status: '', country: '', zone: '' })}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <RotateCcw size={14} />
                    Reset All
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Country Name</label>
                    <input 
                      type="text" 
                      value={filters.country}
                      onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                      placeholder="e.g., Senegal, Morocco..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by ITRF Frame</label>
                    <select 
                      value={filters.itrf}
                      onChange={(e) => setFilters({ ...filters, itrf: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    >
                      <option value="">All ITRF Frames</option>
                      {Array.from(new Set(countries.map(c => c.itrf).filter(Boolean))).sort().map(itrf => (
                        <option key={itrf} value={itrf}>{itrf}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Status</label>
                    <select 
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    >
                      <option value="">All Statuses</option>
                      <option value="COMPLETE">ITRF with Epoch</option>
                      <option value="NO_EPOCH">ITRF without Epoch</option>
                      <option value="MISSING_INFO">Missing Information</option>
                      <option value="LOCAL_NETWORK">Local Network</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Zone</label>
                    <select 
                      value={filters.zone}
                      onChange={(e) => setFilters({ ...filters, zone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    >
                      <option value="">All Zones</option>
                      <option value="NORTH">NORTH</option>
                      <option value="SOUTH">SOUTH</option>
                      <option value="EAST">EAST</option>
                      <option value="WEST">WEST</option>
                      <option value="CENTER">CENTER</option>
                    </select>
                  </div>
                </div>

                <div className="mt-12 flex justify-center">
                  <button 
                    onClick={() => setActiveTab('table')}
                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
                  >
                    Apply Filters & View Results ({filteredData.length} countries)
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div 
              key="chat-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="max-w-4xl mx-auto h-[calc(100vh-220px)] min-h-[500px]"
            >
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col h-full overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900">Technical Expert - Geodesy Africa</h2>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        Technical Documentation Access
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Expert Knowledge Active</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                  {chatMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-60">
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                        <Globe size={28} className="text-indigo-400" />
                      </div>
                      <div className="max-w-xs">
                        <p className="text-sm font-bold text-slate-900">Technical Documentation Query</p>
                        <p className="text-xs text-slate-500 mt-1">Submit your queries regarding African geodetic reference frames and ITRF standards based on the provided technical documentation.</p>
                      </div>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "flex",
                        msg.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className={cn(
                        "max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                        msg.role === 'user' 
                          ? "bg-indigo-600 text-white rounded-tr-none" 
                          : "bg-white text-slate-700 border border-slate-100 rounded-tl-none markdown-body"
                      )}>
                        {msg.role === 'user' ? (
                          msg.text
                        ) : (
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-white">
                  <form onSubmit={handleChatSubmit} className="flex gap-3">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask your question here..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={isChatLoading || !chatInput.trim()}
                      className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95",
                        isChatLoading || !chatInput.trim() 
                          ? "bg-slate-100 text-slate-400" 
                          : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100"
                      )}
                    >
                      <Send size={20} />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'sources' && (
            <motion.div 
              key="sources-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none text-slate-200">
                  <BookOpen size={200} />
                </div>
                
                <h2 className="text-3xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <BookOpen className="text-blue-600" />
                  Sources & Methodology
                </h2>
                
                <div className="prose prose-slate max-w-none space-y-6 text-slate-600">
                  <p>
                    This dashboard was designed to visualize the current state of geodetic reference frames across the African continent. The data is derived from technical compilations of national GNSS networks and international reference frames (ITRF).
                  </p>
                  
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <h3 className="text-slate-900 font-bold mb-4 flex items-center gap-2">
                      <ChevronRight size={18} className="text-blue-600" />
                      Primary Data
                    </h3>
                    <ul className="list-disc list-inside space-y-2">
                      <li>AFREF (African Reference Frame) technical reports</li>
                      <li>IERS (International Earth Rotation and Reference Systems Service) data</li>
                      <li>Publications from national geographic services of African countries</li>
                      <li>Inventory of CORS (Continuously Operating Reference Stations)</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <h3 className="text-slate-900 font-bold mb-4 flex items-center gap-2">
                      <ChevronRight size={18} className="text-blue-600" />
                      Classification
                    </h3>
                    <p className="text-sm">
                      The classification is based on the simultaneous availability of a recent ITRF frame and a valid reference epoch, crucial elements for dynamic geodetic accuracy.
                    </p>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Developed by</p>
                    <p className="text-slate-900 font-medium">Wonbleon Brice Emery PLEI & El Hadji Abdoul Aziz SALL</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-blue-600">
                      <Globe size={24} />
                    </div>
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-blue-600">
                      <Info size={24} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isEditModalOpen && editingCountry && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Edit2 size={20} className="text-indigo-600" />
                  {editingCountry.id ? "Edit Country" : "Add Country"}
                </h2>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ISO Code (ID)</label>
                    <input 
                      type="text" 
                      value={editingCountry.id || ''}
                      onChange={(e) => setEditingCountry({ ...editingCountry, id: e.target.value.toUpperCase() })}
                      disabled={!!countries.find(c => c.id === editingCountry.id) && countries.findIndex(c => c.id === editingCountry.id) !== -1}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      placeholder="e.g., SEN"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{headers.country}</label>
                    <div className="relative">
                      {editingCountry.id && getFlagUrl(editingCountry.id) && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <img 
                            src={getFlagUrl(editingCountry.id)!} 
                            alt="" 
                            className="w-5 h-auto rounded-sm border border-slate-100"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      <input 
                        type="text" 
                        value={editingCountry.country || ''}
                        onChange={(e) => setEditingCountry({ ...editingCountry, country: e.target.value })}
                        className={cn(
                          "w-full bg-slate-50 border border-slate-200 rounded-xl py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none",
                          editingCountry.id && getFlagUrl(editingCountry.id) ? "pl-10 pr-4" : "px-4"
                        )}
                        placeholder="e.g., Senegal"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{headers.formerNetwork}</label>
                  <input 
                    type="text" 
                    value={editingCountry.formerNetwork || ''}
                    onChange={(e) => setEditingCountry({ ...editingCountry, formerNetwork: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{headers.currentNetwork}</label>
                  <input 
                    type="text" 
                    value={editingCountry.currentNetwork || ''}
                    onChange={(e) => setEditingCountry({ ...editingCountry, currentNetwork: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{headers.itrf}</label>
                    <input 
                      type="text" 
                      value={editingCountry.itrf || ''}
                      onChange={(e) => setEditingCountry({ ...editingCountry, itrf: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{headers.epoch}</label>
                    <input 
                      type="text" 
                      value={editingCountry.epoch || ''}
                      onChange={(e) => setEditingCountry({ ...editingCountry, epoch: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{headers.status}</label>
                    <select 
                      value={editingCountry.status || 'MISSING_INFO'}
                      onChange={(e) => setEditingCountry({ ...editingCountry, status: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    >
                      <option value="COMPLETE">ITRF with Epoch</option>
                      <option value="NO_EPOCH">ITRF without Epoch</option>
                      <option value="MISSING_INFO">Missing Information</option>
                      <option value="LOCAL_NETWORK">Local Network</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zone</label>
                    <select 
                      value={editingCountry.zone || 'WEST'}
                      onChange={(e) => setEditingCountry({ ...editingCountry, zone: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    >
                      <option value="NORTH">NORTH</option>
                      <option value="SOUTH">SOUTH</option>
                      <option value="EAST">EAST</option>
                      <option value="WEST">WEST</option>
                      <option value="CENTER">CENTER</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-white transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveCountry}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Edit Modal */}
      <AnimatePresence>
        {isHeaderModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Settings size={20} className="text-indigo-600" />
                  Edit Table Headers
                </h2>
                <button 
                  onClick={() => setIsHeaderModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Country Column</label>
                  <input 
                    type="text" 
                    value={editingHeaders.country}
                    onChange={(e) => setEditingHeaders({ ...editingHeaders, country: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Former Network Column</label>
                  <input 
                    type="text" 
                    value={editingHeaders.formerNetwork}
                    onChange={(e) => setEditingHeaders({ ...editingHeaders, formerNetwork: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Network Column</label>
                  <input 
                    type="text" 
                    value={editingHeaders.currentNetwork}
                    onChange={(e) => setEditingHeaders({ ...editingHeaders, currentNetwork: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ITRF Column</label>
                  <input 
                    type="text" 
                    value={editingHeaders.itrf}
                    onChange={(e) => setEditingHeaders({ ...editingHeaders, itrf: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Epoch Column</label>
                  <input 
                    type="text" 
                    value={editingHeaders.epoch}
                    onChange={(e) => setEditingHeaders({ ...editingHeaders, epoch: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Column</label>
                  <input 
                    type="text" 
                    value={editingHeaders.status}
                    onChange={(e) => setEditingHeaders({ ...editingHeaders, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <button 
                  onClick={() => setIsHeaderModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-white transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setHeaders(editingHeaders);
                    setIsHeaderModalOpen(false);
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Save Headers
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-100 text-center text-slate-400 text-xs">
        <p>© 2026 DYNAMIC GEODETIC REFERENCE FRAMES IN AFRICA</p>
        <p className="mt-1">Interactive visualization of continental geodetic data</p>
      </footer>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-200 transition-all group shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <p className={cn(
        "text-sm font-medium",
        value ? "text-slate-800" : "text-slate-400 italic"
      )}>
        {value || "Not specified"}
      </p>
    </div>
  );
}
