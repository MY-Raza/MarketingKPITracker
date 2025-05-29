import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { 
  CVJStageName, 
  UnitType, 
  type CVJStage, 
  type KPI, 
  type Week, 
  type MonthlyKpiTarget, 
  type Month,
  type KpiFormData 
} from '../types/kpi';
import { 
  INITIAL_CVJ_STAGES, 
  DEFAULT_WEEKS, 
  INITIAL_MONTHLY_TARGETS 
} from '../constants/kpi';

export default function Admin() {
  const [cvjStages, setCvjStages] = useState<CVJStage[]>(INITIAL_CVJ_STAGES);
  const [weeks, setWeeks] = useState<Week[]>(DEFAULT_WEEKS);
  const [monthlyTargets, setMonthlyTargets] = useState<MonthlyKpiTarget[]>(INITIAL_MONTHLY_TARGETS);
  const [adminTab, setAdminTab] = useState<'kpis' | 'targets' | 'weeks'>('kpis');
  const [selectedMonthId, setSelectedMonthId] = useState<string>('2024-05');
  
  // Modal states
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<KPI | undefined>();
  const [defaultSubCategoryName, setDefaultSubCategoryName] = useState<string>('');
  const [defaultCvjStageName, setDefaultCvjStageName] = useState<CVJStageName>(CVJStageName.AWARE);

  // Get all KPIs
  const allKpis = cvjStages.flatMap(stage => 
    stage.subCategories.flatMap(subCategory => subCategory.kpis)
  );

  // Get unique months
  const uniqueMonths = [{
    id: '2024-05',
    name: 'May 2024',
    year: 2024,
    month: 5
  }];

  const openKpiModal = useCallback((kpiToEdit?: KPI, subCategoryName?: string, cvjStageName?: CVJStageName) => {
    setEditingKpi(kpiToEdit);
    setDefaultSubCategoryName(subCategoryName || '');
    setDefaultCvjStageName(cvjStageName || CVJStageName.AWARE);
    setIsKpiModalOpen(true);
  }, []);

  const handleKpiFormSubmit = useCallback((formData: KpiFormData) => {
    const newKpiData: KPI = {
      id: formData.id || `kpi-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      unitType: formData.unitType,
      defaultMonthlyTargetValue: parseFloat(formData.defaultMonthlyTargetValue) || null,
      isActive: true,
    };

    setCvjStages(prevStages => {
      return prevStages.map(stage => {
        if (stage.name === formData.cvjStageName) {
          const updatedSubCategories = stage.subCategories.map(subCategory => {
            if (subCategory.name === formData.subCategoryName) {
              if (formData.id) {
                return {
                  ...subCategory,
                  kpis: subCategory.kpis.map(kpi => 
                    kpi.id === formData.id ? newKpiData : kpi
                  )
                };
              } else {
                return {
                  ...subCategory,
                  kpis: [...subCategory.kpis, newKpiData]
                };
              }
            }
            return subCategory;
          });

          return { ...stage, subCategories: updatedSubCategories };
        }
        return stage;
      });
    });

    setIsKpiModalOpen(false);
    setEditingKpi(undefined);
  }, []);

  const handleDeleteKpi = useCallback((kpiId: string) => {
    setCvjStages(prevStages => {
      return prevStages.map(stage => ({
        ...stage,
        subCategories: stage.subCategories.map(subCategory => ({
          ...subCategory,
          kpis: subCategory.kpis.filter(kpi => kpi.id !== kpiId)
        }))
      }));
    });
  }, []);

  const filteredTargets = monthlyTargets.filter(target => target.monthId === selectedMonthId);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Administration</h2>
        
        <div className="flex space-x-4 mb-6">
          <Button
            variant={adminTab === 'kpis' ? 'default' : 'outline'}
            onClick={() => setAdminTab('kpis')}
          >
            Manage KPIs
          </Button>
          <Button
            variant={adminTab === 'targets' ? 'default' : 'outline'}
            onClick={() => setAdminTab('targets')}
          >
            Monthly Targets
          </Button>
          <Button
            variant={adminTab === 'weeks' ? 'default' : 'outline'}
            onClick={() => setAdminTab('weeks')}
          >
            Manage Weeks
          </Button>
        </div>
      </div>

      {adminTab === 'kpis' && (
        <div className="space-y-6">
          {cvjStages.map(stage => (
            <Card key={stage.id}>
              <CardHeader className={`${stage.colorCode} text-white flex flex-row justify-between items-center`}>
                <CardTitle className="text-lg font-semibold">{stage.name}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openKpiModal(undefined, '', stage.name)}
                  className="bg-white text-gray-700 hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add KPI
                </Button>
              </CardHeader>

              <CardContent className="p-6">
                {stage.subCategories.map(subCategory => (
                  <div key={subCategory.id} className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-900">{subCategory.name}</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openKpiModal(undefined, subCategory.name, stage.name)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add to {subCategory.name}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {subCategory.kpis.map(kpi => (
                        <div key={kpi.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-gray-900">{kpi.name}</h5>
                            <div className="flex space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openKpiModal(kpi, subCategory.name, stage.name)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteKpi(kpi.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{kpi.description}</p>
                          <div className="text-xs text-gray-500">
                            <div>Unit: {kpi.unitType}</div>
                            <div>Default Target: {kpi.defaultMonthlyTargetValue || 'None'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {adminTab === 'targets' && (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-gray-900">Monthly Targets</h3>
                <Select value={selectedMonthId} onValueChange={setSelectedMonthId}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueMonths.map(month => (
                      <SelectItem key={month.id} value={month.id}>
                        {month.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => {}}>
                <Plus className="w-4 h-4 mr-2" />
                Add Target
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      KPI
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTargets.map(target => {
                    const kpi = allKpis.find(k => k.id === target.kpiId);
                    return (
                      <tr key={target.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {kpi?.name || 'Unknown KPI'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {target.targetValue}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {}}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {}}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {adminTab === 'weeks' && (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Manage Weeks</h3>
              <Button onClick={() => {}}>
                <Plus className="w-4 h-4 mr-2" />
                Add Week
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Week
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Range
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {weeks.map(week => (
                    <tr key={week.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {week.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {week.startDateString} to {week.endDateString}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {}}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {}}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Modal */}
      <Dialog open={isKpiModalOpen} onOpenChange={setIsKpiModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingKpi ? 'Edit KPI' : 'Add New KPI'}</DialogTitle>
          </DialogHeader>
          <KpiModalForm 
            kpiData={{
              id: editingKpi?.id,
              name: editingKpi?.name || '',
              description: editingKpi?.description || '',
              unitType: editingKpi?.unitType || UnitType.NUMBER,
              defaultMonthlyTargetValue: editingKpi?.defaultMonthlyTargetValue?.toString() || '',
              subCategoryName: defaultSubCategoryName,
              cvjStageName: defaultCvjStageName,
            }}
            allCvjStages={cvjStages}
            onSubmit={handleKpiFormSubmit}
            onClose={() => setIsKpiModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// KPI Modal Form Component
function KpiModalForm({ 
  kpiData, 
  allCvjStages, 
  onSubmit, 
  onClose 
}: {
  kpiData: KpiFormData;
  allCvjStages: CVJStage[];
  onSubmit: (data: KpiFormData) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<KpiFormData>(kpiData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const handleChange = (field: keyof KpiFormData, value: string | UnitType | CVJStageName) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectedStage = allCvjStages.find(stage => stage.name === formData.cvjStageName);
  const subCategories = selectedStage?.subCategories || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">KPI Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="cvjStage">CVJ Stage</Label>
        <Select value={formData.cvjStageName} onValueChange={(value: CVJStageName) => handleChange('cvjStageName', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(CVJStageName).map(stageName => (
              <SelectItem key={stageName} value={stageName}>
                {stageName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="subCategory">Sub Category</Label>
        <Select value={formData.subCategoryName} onValueChange={(value) => handleChange('subCategoryName', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select Sub Category" />
          </SelectTrigger>
          <SelectContent>
            {subCategories.map(subCategory => (
              <SelectItem key={subCategory.id} value={subCategory.name}>
                {subCategory.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="unitType">Unit Type</Label>
        <Select value={formData.unitType} onValueChange={(value: UnitType) => handleChange('unitType', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(UnitType).map(unitType => (
              <SelectItem key={unitType} value={unitType}>
                {unitType.replace('_', ' ').toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="defaultTarget">Default Monthly Target</Label>
        <Input
          id="defaultTarget"
          type="number"
          step="0.01"
          value={formData.defaultMonthlyTargetValue}
          onChange={(e) => handleChange('defaultMonthlyTargetValue', e.target.value)}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          {formData.id ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}