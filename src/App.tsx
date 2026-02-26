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
  ExternalLink
} from 'lucide-react';
import { AFRICA_DATA, CountryData, TableHeaders } from './data';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
      .then(response => response.json())
      .then(geoJson => {
        const africanIsoCodes = data.map(d => d.id);
        // Fallback for common ID variations (e.g. South Sudan might be SDS in some GeoJSONs)
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

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Fixed projection (no zoom/pan)
    const projection = d3.geoMercator()
      .scale(width / 1.8) // Reduced scale to fit the whole continent
      .center([18, 5])    // Adjusted center
      .translate([width / 2, height / 2]);

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
        if (!country) return '#f1f5f9'; // Slate 100
        switch (country.status) {
          case 'COMPLET': return '#93c5fd'; // Soft Blue
          case 'SANS_EPOQUE': return '#fde047'; // Soft Yellow
          case 'MANQUE_INFO': return '#fca5a5'; // Soft Red
          case 'CANEVA_LOCAL': return '#c084fc'; // Soft Purple
          case 'ACTIF': return '#cbd5e1'; // Soft Slate
          default: return '#f1f5f9';
        }
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
      .attr('font-size', '8px')
      .attr('font-weight', '600')
      .attr('fill', '#334155')
      .attr('pointer-events', 'none')
      .text((d: any) => {
        const country = data.find(c => c.id === d.id);
        return country ? country.pays : d.properties.name;
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
        if (!country) return '#f1f5f9';
        switch (country.status) {
          case 'COMPLET': return '#93c5fd';
          case 'SANS_EPOQUE': return '#fde047';
          case 'MANQUE_INFO': return '#fca5a5';
          case 'CANEVA_LOCAL': return '#c084fc';
          case 'ACTIF': return '#cbd5e1';
          default: return '#f1f5f9';
        }
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
      .attr('font-size', '7px')
      .attr('font-weight', '700')
      .attr('fill', '#475569')
      .text((d: any) => d.name);

  }, [geoData, selectedCountryId, onCountryClick, data]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col">
      <div className="py-3 px-4 border-b border-slate-100 bg-slate-50/50 flex justify-center items-center">
        <h2 className="text-[10px] md:text-xs font-black text-black uppercase tracking-[0.2em] text-center">
          CARTOGRAPHY OF REFERENCE SYSTEMS IN AFRICA
        </h2>
      </div>
      
      <div className="relative flex-1 overflow-hidden">
        <svg ref={svgRef} className="w-full h-full" />
        
        {/* Draggable Statistical Summary Overlay */}
      <motion.div 
        drag
        dragConstraints={containerRef}
        dragMomentum={false}
        className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-xl border border-slate-200 text-[10px] text-slate-700 shadow-lg min-w-[180px] cursor-move active:shadow-2xl transition-shadow"
      >
        <div className="font-bold mb-2 text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1 flex items-center justify-between">
          <span>Statistical Summary 📊</span>
          <div className="flex flex-col gap-0.5">
            <div className="w-3 h-0.5 bg-slate-300 rounded-full" />
            <div className="w-3 h-0.5 bg-slate-300 rounded-full" />
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
              { label: 'Complete', status: 'COMPLET', color: 'bg-[#93c5fd]' },
              { label: 'No Epoch', status: 'SANS_EPOQUE', color: 'bg-[#fde047]' },
              { label: 'Missing', status: 'MANQUE_INFO', color: 'bg-[#fca5a5]' },
              { label: 'Local', status: 'CANEVA_LOCAL', color: 'bg-[#c084fc]' }
            ].map((item) => {
              const count = data.filter(c => c.status === item.status).length;
              const percentage = data.length > 0 ? ((count / data.length) * 100).toFixed(1) : 0;
              return (
                <tr key={item.status} className="group">
                  <td className="py-1 flex items-center gap-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", item.color)} />
                    <span className="font-medium">{item.label}</span>
                  </td>
                  <td className="py-1 text-right font-mono font-bold text-slate-900">{count}</td>
                  <td className="py-1 text-right font-mono text-slate-500">{percentage}%</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 mt-1">
              <td className="pt-1 font-bold text-indigo-600 uppercase">Total</td>
              <td className="pt-1 text-right font-mono font-black text-indigo-600">{data.length}</td>
              <td className="pt-1 text-right font-mono text-indigo-600">100%</td>
            </tr>
          </tfoot>
        </table>
      </motion.div>

      {/* Draggable Legend Overlay */}
      <motion.div 
        drag
        dragConstraints={containerRef}
        dragMomentum={false}
        className="absolute bottom-[190px] left-4 z-20 flex flex-col gap-2 bg-white/95 backdrop-blur-md p-4 rounded-xl border border-slate-200 text-xs text-slate-700 shadow-lg cursor-move active:shadow-2xl transition-shadow"
      >
        <div className="font-bold mb-1 text-slate-900 uppercase tracking-wider flex items-center justify-between">
          <span>Legend 🗺️</span>
          <div className="flex flex-col gap-0.5">
            <div className="w-3 h-0.5 bg-slate-300 rounded-full" />
            <div className="w-3 h-0.5 bg-slate-300 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#93c5fd] border border-blue-400" />
          <span>ITRF with Epoch ✅</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#fde047] border border-yellow-400" />
          <span>ITRF without Epoch ⚠️</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#fca5a5] border border-red-400" />
          <span>Missing Information ❌</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#c084fc] border border-purple-400" />
          <span>Local Network 📍</span>
        </div>
      </motion.div>

      {/* Draggable Credits Overlay */}
      <motion.div 
        drag
        dragConstraints={containerRef}
        dragMomentum={false}
        className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 bg-white/95 backdrop-blur-md p-4 rounded-xl border border-slate-200 text-[10px] text-slate-700 shadow-lg cursor-move active:shadow-2xl transition-shadow"
      >
        <div className="font-bold mb-1 text-slate-900 uppercase tracking-wider flex items-center justify-between gap-4">
          <span>Realized and produced by:</span>
          <div className="flex flex-col gap-0.5">
            <div className="w-3 h-0.5 bg-slate-300 rounded-full" />
            <div className="w-3 h-0.5 bg-slate-300 rounded-full" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <User size={12} className="text-indigo-600" />
            <span className="font-bold text-slate-900">Wonbleon Brice Emery PLEI</span>
          </div>
          <div className="flex items-center gap-2">
            <User size={12} className="text-indigo-600" />
            <span className="font-bold text-slate-900">El Hadji Abdoul Aziz SALL</span>
          </div>
        </div>
      </motion.div>
      </div>
    </div>
  );
};

export default function App() {
  const [countries, setCountries] = useState<CountryData[]>(() => {
    const saved = localStorage.getItem('geodetic_data');
    return saved ? JSON.parse(saved) : AFRICA_DATA;
  });

  const [headers, setHeaders] = useState<TableHeaders>(() => {
    const saved = localStorage.getItem('table_headers');
    return saved ? JSON.parse(saved) : {
      country: 'Country 🌍',
      formerNetwork: 'Former Network 🏛️',
      currentNetwork: 'Current Network 📡',
      itrf: 'ITRF 📐',
      epoch: 'Epoch ⏱️',
      status: 'Status 🏷️'
    };
  });

  useEffect(() => {
    localStorage.setItem('geodetic_data', JSON.stringify(countries));
  }, [countries]);

  useEffect(() => {
    localStorage.setItem('table_headers', JSON.stringify(headers));
  }, [headers]);

  // Force update title if it's the old default to match user request
  useEffect(() => {
    // No longer needed as title is hardcoded
  }, []);

  const handleSaveAll = () => {
    localStorage.setItem('geodetic_data', JSON.stringify(countries));
    localStorage.setItem('table_headers', JSON.stringify(headers));
    alert("Toutes les modifications ont été enregistrées avec succès !");
  };

  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'map' | 'table' | 'sources'>('map');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
  const [isChatSourcesOpen, setIsChatSourcesOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Partial<CountryData> | null>(null);
  const [editingHeaders, setEditingHeaders] = useState<TableHeaders>(headers);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(countries.map(c => ({
      'Country': c.pays,
      'Former Network': c.reseauAncien,
      'Current Network': c.reseauActuel,
      'ITRF': c.itrf,
      'Epoch': c.epoque,
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
    return countries.filter(c => 
      c.pays.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.itrf.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.reseauActuel.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, countries]);

  const handleSaveCountry = () => {
    if (!editingCountry?.id || !editingCountry?.pays) {
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
      pays: '',
      reseauAncien: '',
      reseauActuel: '',
      itrf: '',
      epoque: '',
      status: 'MANQUE_INFO'
    });
    setIsEditModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div id="authors-section">
              <motion.h1 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl md:text-2xl font-black tracking-tight text-black uppercase"
              >
                PRT M2 - DYNAMICS OF GEODETIC REFERENCE FRAMES IN AFRICA
              </motion.h1>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col mt-2"
              >
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em] mb-1">AUTHORS</span>
                <div className="flex flex-wrap items-center gap-4 text-slate-600 text-sm">
                  <div className="flex items-center gap-1.5">
                    <User size={14} className="text-indigo-600" />
                    <span>Wonbleon Brice Emery PLEI</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  <div className="flex items-center gap-1.5">
                    <User size={14} className="text-indigo-600" />
                    <span>El Hadji Abdoul Aziz SALL</span>
                  </div>
                </div>
              </motion.div>
            </div>
            
            <div className="flex flex-col items-end gap-3">
              <div className="text-center w-full md:w-auto">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">
                  UNIVERSITÉ IBA DER THIAM DE THIÈS (UFR-SI)
                </span>
              </div>
              <nav className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
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
              <div className="relative">
                <button 
                  onClick={() => setIsChatSourcesOpen(!isChatSourcesOpen)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-slate-500 hover:text-slate-900 hover:bg-slate-200",
                    isChatSourcesOpen && "bg-slate-200 text-slate-900"
                  )}
                >
                  <BookOpen size={16} />
                  Chat Sources
                  <ChevronDown size={14} className={cn("transition-transform", isChatSourcesOpen && "rotate-180")} />
                </button>
                
                <AnimatePresence>
                  {isChatSourcesOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-[60]"
                    >
                      <button 
                        onClick={() => {
                          window.open('https://notebooklm.google.com/notebook/574afb8b-3d81-43b8-979d-817da2fa56b5?authuser=1', '_blank');
                          setIsChatSourcesOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        Partie 1
                      </button>
                      <button 
                        onClick={() => {
                          window.open('https://notebooklm.google.com/notebook/7168590f-d36f-426b-9f54-382eea234d8b?authuser=1', '_blank');
                          setIsChatSourcesOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        Partie 2
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
                title="Enregistrer toutes les modifications"
              >
                <Save size={16} />
                Enregistrer
              </button>
            </nav>
          </div>
        </div>
      </div>
    </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'map' && (
            <motion.div 
              key="map-tab"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)] min-h-[750px]"
            >
              {/* Map Section */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="flex justify-end">
                  <button 
                    onClick={exportMapAsImage}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                  >
                    <Download size={16} />
                    Export Map Image (PNG)
                  </button>
                </div>
                <div className="relative flex-1" ref={mapContainerRef}>
                  <AfricaMap 
                    onCountryClick={setSelectedCountry} 
                    selectedCountryId={selectedCountry?.id || null} 
                    data={countries}
                    headers={headers}
                    setEditingHeaders={setEditingHeaders}
                    setIsHeaderModalOpen={setIsHeaderModalOpen}
                  />
                </div>
              </div>

              {/* Info Panel */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Info size={18} className="text-indigo-600" />
                    Country Details 📋
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
                
                <div className="flex-1 overflow-y-auto p-6">
                  {selectedCountry ? (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm",
                          selectedCountry.status === 'COMPLET' ? "bg-blue-50 text-blue-600" :
                          selectedCountry.status === 'SANS_EPOQUE' ? "bg-yellow-50 text-yellow-600" :
                          selectedCountry.status === 'MANQUE_INFO' ? "bg-red-50 text-red-600" :
                          selectedCountry.status === 'CANEVA_LOCAL' ? "bg-purple-50 text-purple-600" :
                          "bg-slate-50 text-slate-600"
                        )}>
                          <Globe size={24} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-slate-900">{selectedCountry.pays}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                              "text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full",
                              selectedCountry.status === 'COMPLET' ? "bg-blue-100 text-blue-700" :
                              selectedCountry.status === 'SANS_EPOQUE' ? "bg-yellow-100 text-yellow-700" :
                              selectedCountry.status === 'MANQUE_INFO' ? "bg-red-100 text-red-700" :
                              selectedCountry.status === 'CANEVA_LOCAL' ? "bg-purple-100 text-purple-700" :
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
                        <InfoItem label={headers.formerNetwork} value={selectedCountry.reseauAncien} emoji="🏛️" />
                        <InfoItem label={headers.currentNetwork} value={selectedCountry.reseauActuel} emoji="📡" />
                        <InfoItem label={headers.itrf} value={selectedCountry.itrf} emoji="📐" />
                        <InfoItem label={headers.epoch} value={selectedCountry.epoque} emoji="⏱️" />
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                        <MapIcon size={32} className="text-slate-400" />
                      </div>
                      <p className="text-sm max-w-[200px] text-slate-500">
                        Click on a country on the map to see detailed information ✨
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
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search for a country, ITRF..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium transition-colors">
                    <Filter size={16} />
                    Filter
                  </button>
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
                            {country.pays}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                            {country.reseauAncien || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                            {country.reseauActuel || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-indigo-600">
                            {country.itrf || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-amber-600">
                            {country.epoque || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[10px] uppercase font-black tracking-tighter px-2 py-1 rounded-md",
                              country.status === 'COMPLET' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                              country.status === 'SANS_EPOQUE' ? "bg-yellow-50 text-yellow-600 border border-yellow-100" :
                              country.status === 'MANQUE_INFO' ? "bg-red-50 text-red-600 border border-red-100" :
                              country.status === 'CANEVA_LOCAL' ? "bg-purple-50 text-purple-600 border border-purple-100" :
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
                  Sources & Méthodologie 📚
                </h2>
                
                <div className="prose prose-slate max-w-none space-y-6 text-slate-600">
                  <p>
                    Ce tableau de bord a été conçu pour visualiser l'état actuel des repères de référence géodésique à travers le continent africain. Les données sont issues de compilations techniques sur les réseaux GNSS nationaux et les cadres de référence internationaux (ITRF).
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

      {/* Edit Modal */}
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
                    <input 
                      type="text" 
                      value={editingCountry.pays || ''}
                      onChange={(e) => setEditingCountry({ ...editingCountry, pays: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      placeholder="e.g., Senegal"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{headers.formerNetwork}</label>
                  <input 
                    type="text" 
                    value={editingCountry.reseauAncien || ''}
                    onChange={(e) => setEditingCountry({ ...editingCountry, reseauAncien: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{headers.currentNetwork}</label>
                  <input 
                    type="text" 
                    value={editingCountry.reseauActuel || ''}
                    onChange={(e) => setEditingCountry({ ...editingCountry, reseauActuel: e.target.value })}
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
                      value={editingCountry.epoque || ''}
                      onChange={(e) => setEditingCountry({ ...editingCountry, epoque: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{headers.status}</label>
                  <select 
                    value={editingCountry.status || 'MANQUE_INFO'}
                    onChange={(e) => setEditingCountry({ ...editingCountry, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  >
                    <option value="COMPLET">ITRF with Epoch ✅</option>
                    <option value="SANS_EPOQUE">ITRF without Epoch ⚠️</option>
                    <option value="MANQUE_INFO">Missing Information ❌</option>
                    <option value="CANEVA_LOCAL">Local Network 📍</option>
                  </select>
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
        <p className="mt-1">Interactive visualization of continental geodetic data 🌍✨</p>
      </footer>
    </div>
  );
}

function InfoItem({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-200 transition-all group shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{emoji}</span>
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
