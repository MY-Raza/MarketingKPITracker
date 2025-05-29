import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { 
  type Week, 
  type WeeklyDataEntry, 
  type CVJStage, 
  type KPI 
} from '../types/kpi';
import { 
  INITIAL_CVJ_STAGES, 
  DEFAULT_WEEKS, 
  INITIAL_WEEKLY_DATA 
} from '../constants/kpi';

export default function DataEntry() {
  const [cvjStages] = useState<CVJStage[]>(INITIAL_CVJ_STAGES);
  const [weeks] = useState<Week[]>(DEFAULT_WEEKS);
  const [weeklyData, setWeeklyData] = useState<WeeklyDataEntry[]>(INITIAL_WEEKLY_DATA);
  const [selectedWeekId, setSelectedWeekId] = useState<string>(weeks[0]?.id || '');

  const selectedWeek = weeks.find(week => week.id === selectedWeekId);

  const handleDataChange = useCallback((kpiId: string, actualValue: string) => {
    const numericValue = actualValue === '' ? null : parseFloat(actualValue);
    
    setWeeklyData(prevData => {
      const existingEntryIndex = prevData.findIndex(
        entry => entry.weekId === selectedWeekId && entry.kpiId === kpiId
      );

      if (existingEntryIndex >= 0) {
        const updatedData = [...prevData];
        updatedData[existingEntryIndex] = {
          ...updatedData[existingEntryIndex],
          actualValue: numericValue,
        };
        return updatedData;
      } else {
        const newEntry: WeeklyDataEntry = {
          weekId: selectedWeekId,
          kpiId,
          actualValue: numericValue,
        };
        return [...prevData, newEntry];
      }
    });
  }, [selectedWeekId]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Weekly Data Entry</h2>
        <div className="w-64">
          <Select value={selectedWeekId} onValueChange={setSelectedWeekId}>
            <SelectTrigger>
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent>
              {weeks.map(week => (
                <SelectItem key={week.id} value={week.id}>
                  {week.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedWeek && (
        <Card>
          <CardHeader className="bg-blue-50 border-b">
            <CardTitle className="text-blue-900">
              {selectedWeek.id}
            </CardTitle>
            <p className="text-sm text-blue-700">
              {selectedWeek.startDateString} to {selectedWeek.endDateString}
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {cvjStages.map(stage => (
              <div key={stage.id} className="mb-8">
                <div className={`p-3 ${stage.colorCode} text-white rounded-lg mb-4`}>
                  <h4 className="font-semibold">{stage.name}</h4>
                </div>

                {stage.subCategories.map(subCategory => (
                  <div key={subCategory.id} className="mb-6">
                    <h5 className="font-medium text-gray-900 mb-3">{subCategory.name}</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {subCategory.kpis.map(kpi => {
                        const existingEntry = weeklyData.find(
                          entry => entry.weekId === selectedWeekId && entry.kpiId === kpi.id
                        );

                        return (
                          <div key={kpi.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                            <div className="flex-1">
                              <Label className="block text-sm font-medium text-gray-700 mb-1">
                                {kpi.name}
                              </Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={existingEntry?.actualValue?.toString() || ''}
                                onChange={(e) => handleDataChange(kpi.id, e.target.value)}
                                placeholder="Enter value"
                              />
                            </div>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="w-4 h-4 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{kpi.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}