import {bindable, inject} from "aurelia-framework";
import {TaskQueue} from "aurelia-task-queue";
import $ from "jquery";
import { chart, Options } from 'highcharts';
import 'highcharts';
import {HttpClient, json} from 'aurelia-fetch-client';

interface Release {
    name: string;
    releaseDate: Date,
    startDate: Date
}

interface Sprint {
    name: string;
    startDate: Date,
    completeDate: Date,
    stories: Array<Story>
}

interface Story {
    name: string;
    storyPoints: number,
    status: string,
    priority: number;
}

interface SprintData {
    sprint: string;
    completeDate: Date;
    minimumVelocity: number;
    averageVelocity: number;
    maximumVelocity: number;
}

interface ChartData {
    sprints: Array<SprintData>;
    release: Release;
}

@inject(Element, TaskQueue, HttpClient)
export class ReleaseBurnup {
    constructor(private element: Element, private taskQueue: TaskQueue, private http: HttpClient) {

        const settings: Options = {

            chart: {
                type: 'line',
                // Edit chart spacing
                spacingBottom: 15,
                spacingTop: 10,
                spacingLeft: 10,
                marginLeft: 30,
                spacingRight: 10,

                // Explicitly tell the width and height of a chart
                width: 600,
                height: 400
            },
            title: {
                text: 'Release Burnup'
            },
            xAxis: {
                type: 'datetime',
                plotLines: [{
                    color: 'red', // Color value
                    dashStyle: 'longdash', // Style of the plot line. Default to solid
                    value: Date.UTC(2017, 4, 8), // Value of where the line will appear
                    width: 2 // Width of the line
                }]
            },
            yAxis: {
                title: {
                    text: 'Story Points'
                },
            },
            plotOptions: {
                line: {
                    dataLabels: {
                        enabled: true
                    },

                    enableMouseTracking: false
                }
            },
            legend: {
                itemDistance: 80,
            },
            series: [{
                name: 'Minimum',
                data: [[Date.UTC(2017,4,1),5], [Date.UTC(2017,4,10),10], [Date.UTC(2017,4,20),15]]
            },
            {
                name: 'Average',
                data: [[Date.UTC(2017,4,1),10], [Date.UTC(2017,4,10),20], [Date.UTC(2017,4,20),30]]
            },
            {
                name: 'Maximum',
                data: [[Date.UTC(2017,4,1),15], [Date.UTC(2017,4,10),30], [Date.UTC(2017,4,20),45]]
            }]
        };

        const self = this;
        //this.taskQueue.queueMicroTask(() => {
            Promise.all([
                self.GetReleases(),
                self.GetSprints(),
                self.GetPlannedStories()
            ])
            .then(values => ReleaseBurnup.GetChartData(values[0], values[1], values[2]))
            .then(data => ReleaseBurnup.createChartOptions(data, settings))
            .then(s => $(this.element).find('.burnup-container').highcharts(s));
        //});
    }

    private GetReleases(): Promise<Array<Release>> {
        return this.http.fetch('http://localhost:8000/api/backlog/plannedreleases')
                .then(response => <Promise<Array<Release>>>response.json())
    }

    private GetSprints(): Promise<Array<Sprint>> {
        return this.http.fetch('http://localhost:8000/api/backlog/sprints')
                .then(response => <Promise<Array<Sprint>>>response.json());
    }

    private GetPlannedStories(): Promise<Array<Story>> {
        return this.http.fetch('http://localhost:8000/api/backlog/plannedstories')
                .then(response => <Promise<Array<Story>>>response.json());
    }

    private static GetChartData(releases: Array<Release>, sprints: Array<Sprint>, stories: Array<Story>): Promise<ChartData> {
        let minVelocity: number = 0;
        let maxVelocity: number = 0;
        let avgVelocity: number = 0;

        const velocities: Array<number> = [];
        const sprintData: Array<SprintData> = [];

        for(let i=0; i<sprints.length; i++) {
            let velocity: number = 0;
            sprints[i].stories.forEach(s => velocity += s.storyPoints);

            avgVelocity += velocity;

            if(i == 0) {
                minVelocity = velocity;
            }

            if(velocity < minVelocity) {
                minVelocity = velocity;
            }

            if(velocity > maxVelocity) {
                maxVelocity = velocity;
            }
        }

        avgVelocity = avgVelocity / sprints.length;

        for(let i=0; i<sprints.length; i++) {
            const sprint = sprints[i];
            sprintData.push(
                {
                    sprint: sprint.name,
                    completeDate: sprint.completeDate,
                    minimumVelocity: minVelocity,
                    averageVelocity: avgVelocity,
                    maximumVelocity: maxVelocity
                }
            )
        }
        let data: ChartData = {
            release: releases[0],
            sprints: sprintData
        };

        console.log(data);
        return Promise.resolve<ChartData>( data );
    }

    private static createChartOptions(data: ChartData, settings: Options): Promise<Options> {
        const minLine: Array<any> = [];
        const avgLine: Array<any> = [];
        const maxLine: Array<any> = [];
        console.log(data);

        let minSp: number = 0;
        let avgSp: number = 0;
        let maxSp: number = 0;

        data.sprints.forEach(s => {
            minSp += s.minimumVelocity;
            const min = [s.completeDate, minSp];
            minLine.push(min);

            avgSp += s.averageVelocity;
            const avg = [s.completeDate, avgSp];
            avgLine.push(avg);

            maxSp += s.maximumVelocity;
            const max = [s.completeDate, maxSp];
            maxLine.push(max);
        });

        settings.series = [];
        settings.series.push( {
                name: 'Minimum',
                data: minLine
            });

        settings.series.push( {
                name: 'Maximum',
                data: maxLine
            });

        settings.series.push( {
                name: 'Average',
                data: avgLine
            });

        // settings.xAxis.plotLines.push({
        //             color: 'red', // Color value
        //             dashStyle: 'longdash', // Style of the plot line. Default to solid
        //             value: data.Release[], // Value of where the line will appear
        //             width: 2 // Width of the line
        //         });

        return Promise.resolve<Options>(settings);
     };
}
