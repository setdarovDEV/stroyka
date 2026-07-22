import { useState, useEffect, useRef, useCallback } from 'react';
import type { ECharts, EChartsOption } from 'echarts';
import { useApp } from '@/app/context';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DashboardSummary, Paginated, Zone } from '@/api/types';

type ThreeMesh = import('three').Mesh<import('three').BufferGeometry, import('three').Material | import('three').Material[]>;

function MetricCard({ label, value, variant = 'default' }: { label: string; value: string | number; variant?: string }) {
  const colorMap: Record<string, string> = {
    default: 'text-foreground',
    success: 'text-green-400',
    warning: 'text-amber-400',
    danger: 'text-red-400',
    info: 'text-blue-400',
  };
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <p className={cn('text-2xl font-bold', colorMap[variant] || colorMap.default)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function noDataGraphic(show: boolean): EChartsOption['graphic'] {
  if (!show) return undefined;
  return {
    type: 'text',
    left: 'center',
    top: 'middle',
    style: {
      text: 'No data',
      fill: '#64748b',
      fontSize: 13,
      fontWeight: 600,
    },
  };
}

function dashboardLog(event: string, payload?: Record<string, unknown>) {
  console.info('[dashboard:charts]', event, payload ?? {});
}

function dashboardError(event: string, error: unknown, payload?: Record<string, unknown>) {
  console.error('[dashboard:charts]', event, { error, ...payload });
}

function isProjectNotFound(error: unknown) {
  return error instanceof Error && error.message.includes('Project not found');
}

export function DashboardPage() {
  const { currentProject, setCurrentProject, user, t } = useApp();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  const chartMaterialsRef = useRef<HTMLDivElement>(null);
  const chartProgressRef = useRef<HTMLDivElement>(null);
  const chartHoursRef = useRef<HTMLDivElement>(null);
  const chartCostRef = useRef<HTMLDivElement>(null);
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<ECharts[]>([]);
  const chartResizeObserverRef = useRef<ResizeObserver | null>(null);

  const isAdmin = user?.role === 'ADMIN';
  const projectId = currentProject?.id;

  const loadData = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await api.get<DashboardSummary>(`/dashboard/summary?projectId=${projectId}`);
      setSummary(res);
      dashboardLog('summary loaded', {
        projectId,
        materialRows: res.materialChartData?.length ?? 0,
        phaseRows: res.progressByPhase?.length ?? 0,
        workerHoursTotal: res.workerHoursTotal ?? null,
        machineHoursTotal: res.machineHoursTotal ?? null,
        totalPlannedCost: res.totalPlannedCost ?? null,
      });
    } catch (error) {
      dashboardError('summary failed', error, { projectId });
      if (isProjectNotFound(error)) {
        setSummary(null);
        setCurrentProject(null);
        dashboardLog('stale project cleared', { projectId });
      }
    }
    setLoading(false);
  }, [projectId, setCurrentProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (loading || !summary) return;

    let disposed = false;
    const raf = requestAnimationFrame(() => {
      void initCharts(summary).then((charts) => {
        if (disposed) {
          charts.forEach((chart) => chart.dispose());
          chartResizeObserverRef.current?.disconnect();
          chartResizeObserverRef.current = null;
          dashboardLog('init disposed before commit', { chartCount: charts.length });
          return;
        }
        chartsRef.current = charts;
        dashboardLog('init committed', { chartCount: charts.length });
      }).catch((error) => {
        dashboardError('init failed', error);
      });
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      chartsRef.current.forEach((chart) => chart.dispose());
      chartsRef.current = [];
      chartResizeObserverRef.current?.disconnect();
      chartResizeObserverRef.current = null;
      dashboardLog('cleanup complete');
    };
  }, [loading, summary]);

  useEffect(() => {
    if (loading || !summary) return;
    const timer = setTimeout(() => void init3D(), 100);
    return () => clearTimeout(timer);
  }, [loading, summary]);

  async function initCharts(s: DashboardSummary) {
    const containers = [
      chartMaterialsRef.current,
      chartProgressRef.current,
      chartHoursRef.current,
      isAdmin && s.totalPlannedCost != null ? chartCostRef.current : null,
    ].filter((container): container is HTMLDivElement => Boolean(container));

    if (!chartMaterialsRef.current || !chartProgressRef.current || !containers.length) return [];

    const materialData = s.materialChartData ?? [];
    const progressData = s.progressByPhase ?? [];
    const hasMaterialData = materialData.some((d) => d.used > 0) || (s.totalEstimateQuantity || 0) > 0;
    const materialCategories = materialData.length ? materialData.map((d) => d.name) : [t('Material')];
    const usedMaterialValues = materialData.length ? materialData.map((d) => d.used) : [0];
    const plannedMaterialValues = materialData.length
      ? materialData.map(() => s.totalEstimateQuantity || 0)
      : [s.totalEstimateQuantity || 0];
    const hasProgressData = progressData.some((p) => p.avgUsedQuantity > 0);
    const hasHoursData = (s.workerHoursTotal || 0) > 0 || (s.machineHoursTotal || 0) > 0;
    const hasCostData = (s.totalPlannedCost || 0) > 0;

    dashboardLog('init start', {
      containers: containers.map((container) => ({
        width: container.clientWidth,
        height: container.clientHeight,
        children: container.childElementCount,
      })),
      hasMaterialData,
      hasProgressData,
      hasHoursData,
      hasCostData,
      isAdmin,
    });

    chartResizeObserverRef.current?.disconnect();
    const resizeObserver = new ResizeObserver(() => {
      chartsRef.current.forEach((chart) => chart.resize());
    });
    chartResizeObserverRef.current = resizeObserver;
    containers.forEach((container) => resizeObserver.observe(container));

    const charts: ECharts[] = [];

    const mChart = await loadChart(chartMaterialsRef.current, {
      tooltip: { trigger: 'axis' },
      graphic: noDataGraphic(!hasMaterialData),
      legend: { textStyle: { color: '#94a3b8' }, top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: materialCategories, axisLabel: { color: '#94a3b8' }, axisLine: { lineStyle: { color: '#334155' } } },
      yAxis: { type: 'value', min: 0, max: hasMaterialData ? undefined : 1, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
      series: [
        { name: t('Used'), type: 'bar', data: usedMaterialValues, itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] } },
        { name: t('Planned Qty'), type: 'bar', data: plannedMaterialValues, itemStyle: { color: '#64748b', borderRadius: [4, 4, 0, 0] } },
      ],
    });
    charts.push(mChart);

    const phaseData = progressData.map((p) => ({ value: p.avgUsedQuantity || 1, name: p.phaseName || t('Unknown') }));
    const pChart = await loadChart(chartProgressRef.current, {
      tooltip: { trigger: 'item' },
      graphic: noDataGraphic(!hasProgressData),
      legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { color: '#94a3b8' } },
      series: [{
        type: 'pie', radius: ['45%', '70%'], center: ['35%', '50%'],
        data: phaseData.length ? phaseData : [{ value: 1, name: t('No phases'), itemStyle: { color: '#334155' } }],
        label: { show: false },
      }],
    });
    charts.push(pChart);

    if (chartHoursRef.current) {
      const hoursChart = await loadChart(chartHoursRef.current, {
        tooltip: { trigger: 'axis' },
        graphic: noDataGraphic(!hasHoursData),
        legend: { textStyle: { color: '#94a3b8' }, top: 0 },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: [t('Worker Hours'), t('Machine Hours')], axisLabel: { color: '#94a3b8' } },
        yAxis: { type: 'value', min: 0, max: hasHoursData ? undefined : 1, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
        series: [
          { name: t('Actual'), type: 'bar', data: [s.workerHoursTotal || 0, s.machineHoursTotal || 0], itemStyle: { color: '#22c55e', borderRadius: [4, 4, 0, 0] } },
        ],
      });
      charts.push(hoursChart);
    }

    if (chartCostRef.current && isAdmin && s.totalPlannedCost != null) {
      const costChart = await loadChart(chartCostRef.current, {
        tooltip: { trigger: 'item' },
        graphic: noDataGraphic(!hasCostData),
        legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { color: '#94a3b8' } },
        series: [{
          type: 'gauge', center: ['50%', '55%'], radius: '85%',
          min: 0, max: Math.max(s.totalPlannedCost || 100, 100),
          startAngle: 210, endAngle: -30,
          data: [{ value: s.totalPlannedCost || 0, name: t('Planned Cost (UZS)') }],
          detail: { valueAnimation: true, fontSize: 14, color: '#94a3b8', formatter: '{value} UZS' },
          axisLine: { lineStyle: { width: 12, color: [[0.3, '#22c55e'], [0.7, '#3b82f6'], [1, '#ef4444']] } },
        }],
      });
      charts.push(costChart);
    }

    charts.forEach((chart) => chart.resize());
    dashboardLog('init complete', {
      chartCount: charts.length,
      canvases: containers.map((container) => container.querySelectorAll('canvas').length),
      svgs: containers.map((container) => container.querySelectorAll('svg').length),
      html: containers.map((container) => container.innerHTML.length),
    });
    return charts;
  }

  async function loadChart(container: HTMLDivElement, option: EChartsOption) {
    const echarts = await import('echarts');
    echarts.getInstanceByDom(container)?.dispose();
    const chart = echarts.init(container, 'dark');
    chart.setOption({ backgroundColor: 'transparent', ...option });
    dashboardLog('chart loaded', {
      width: container.clientWidth,
      height: container.clientHeight,
      canvasCount: container.querySelectorAll('canvas').length,
      svgCount: container.querySelectorAll('svg').length,
      childCount: container.childElementCount,
    });
    return chart;
  }

  async function init3D() {
    const container = threeContainerRef.current;
    if (!container || container.hasChildNodes() || !summary) return;

    const THREE = await import('three');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(8, 6, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x404060, 1.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const meshes: { mesh: ThreeMesh; originalColor: number }[] = [];
    const statusColors: Record<string, number> = {
      NOT_STARTED: 0x64748b, IN_PROGRESS: 0x3b82f6,
      COMPLETED: 0x22c55e, DELAYED: 0xf59e0b, OVER_BUDGET: 0xef4444,
    };

    try {
      const zonesRes = await api.get<Paginated<Zone>>(`/zones?projectId=${projectId}`);
      const zones = zonesRes.items || [];

      if (zones.length > 0) {
        const gridSize = Math.ceil(Math.sqrt(zones.length));
        zones.forEach((zone, i) => {
          const progress = zone.progressPercent ?? 0;
          const geo = new THREE.BoxGeometry(1.5, (progress / 100) * 2 || 0.5, 1.5);
          const color = statusColors[zone.status] || 0x64748b;
          const mat = new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.9 });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(
            (i % gridSize) * 2 - gridSize + 1,
            (progress / 100) || 0.3,
            Math.floor(i / gridSize) * 2 - gridSize / 2
          );
          mesh.userData = zone;
          scene.add(mesh);
          meshes.push({ mesh, originalColor: color });
        });
      } else {
        for (let i = 0; i < 6; i++) {
          const geo = new THREE.BoxGeometry(1.5, 0.5 + Math.random() * 1.5, 1.5);
          const mat = new THREE.MeshPhongMaterial({ color: 0x334155, transparent: true, opacity: 0.3 });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set((i % 3) * 2 - 2, 0.5, Math.floor(i / 3) * 2 - 1);
          scene.add(mesh);
        }
      }

      const tooltip = document.createElement('div');
      tooltip.style.cssText = 'position:absolute;background:rgba(15,23,42,0.95);color:#e2e8f0;padding:8px 12px;border-radius:6px;font-size:12px;pointer-events:none;display:none;border:1px solid #334155;z-index:10;white-space:nowrap';
      container.appendChild(tooltip);

      container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(meshes.map(m => m.mesh));
        if (intersects.length > 0) {
          const zone = intersects[0].object.userData;
          if (zone?.name) {
            tooltip.style.display = 'block';
            tooltip.style.left = `${e.clientX - rect.left + 10}px`;
            tooltip.style.top = `${e.clientY - rect.top - 20}px`;
            tooltip.innerHTML = `<strong>${zone.name}</strong><br/>${t('Floor')}: ${zone.floor || '-'} | ${t('Progress')}: ${zone.progressPercent}%<br/>${t('Status')}: ${zone.status}`;
          }
        } else {
          tooltip.style.display = 'none';
        }
      });

      container.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
    } catch { /* zones fetch failed, keep base 3D */ }

    let angle = 0;
    let animId: number;
    function animate() {
      animId = requestAnimationFrame(animate);
      angle += 0.003;
      camera.position.x = Math.cos(angle) * 10;
      camera.position.z = Math.sin(angle) * 10;
      camera.lookAt(0, 0.5, 0);
      renderer.render(scene, camera);
    }
    animate();

    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      camera.position.multiplyScalar(e.deltaY > 0 ? 1.05 : 0.95);
    }, { passive: false });

    return () => cancelAnimationFrame(animId);
  }

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="space-y-4 text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">{t('Loading dashboard...')}</p>
        </div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <p className="text-lg text-muted-foreground">{t('No project selected')}</p>
          <p className="text-sm text-muted-foreground">{t('Go to Projects to select or create one')}</p>
        </div>
      </div>
    );
  }

  const s = summary;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('Dashboard')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('Construction project overview')} - {currentProject?.name}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <MetricCard label={t('Progress')} value={`${(s?.overallProgress || 0).toFixed(1)}%`} variant="info" />
        <MetricCard label={t('Estimate Lines')} value={s?.totalEstimateLines || 0} />
        <MetricCard label={t('Active Brigades')} value={s?.activeBrigades || 0} variant="success" />
        <MetricCard label={t('Warehouse Items')} value={s?.warehouseItems || 0} />
        <MetricCard label={t('Critical Alerts')} value={s?.alerts?.criticalCount || 0} variant={s?.alerts?.criticalCount ? 'danger' : 'default'} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {isAdmin && <MetricCard label={t('Planned Cost')} value={`${((s?.totalPlannedCost || 0) / 1000000).toFixed(1)}M`} variant="warning" />}
        {isAdmin && <MetricCard label={t('Warehouse Value')} value={`${((s?.totalBalance || 0) / 1000000).toFixed(1)}M`} />}
        <MetricCard label={t('Worker Hours')} value={Math.round(s?.workerHoursTotal || 0)} />
        <MetricCard label={t('Machine Hours')} value={Math.round(s?.machineHoursTotal || 0)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">{t('Material Usage')}</CardTitle></CardHeader>
          <CardContent><div ref={chartMaterialsRef} className="h-64" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">{t('Progress by Phase')}</CardTitle></CardHeader>
          <CardContent><div ref={chartProgressRef} className="h-64" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">{t('Worker & Machine Hours')}</CardTitle></CardHeader>
          <CardContent><div ref={chartHoursRef} className="h-64" /></CardContent>
        </Card>
        {isAdmin && (
          <Card>
            <CardHeader><CardTitle className="text-sm">{t('Planned Cost (Admin)')}</CardTitle></CardHeader>
            <CardContent><div ref={chartCostRef} className="h-64" /></CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">{t('Recent Alerts')}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {s?.recentAlerts?.length ? (
                s.recentAlerts.slice(0, 5).map((a) => (
                  <div key={a.id} className={cn(
                    'flex items-start gap-3 p-3 bg-muted/50 rounded-md border-l-2',
                    a.severity === 'CRITICAL' ? 'border-l-red-500' : a.severity === 'WARNING' ? 'border-l-amber-500' : 'border-l-blue-500'
                  )}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.message}</p>
                    </div>
                    <Badge variant={a.severity === 'CRITICAL' ? 'danger' : a.severity === 'WARNING' ? 'warning' : 'info'}>{a.severity}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t('No active alerts')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">{t('3D Building Prototype')}</CardTitle></CardHeader>
          <CardContent>
            <div ref={threeContainerRef} className="h-80 bg-secondary rounded-lg relative" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
