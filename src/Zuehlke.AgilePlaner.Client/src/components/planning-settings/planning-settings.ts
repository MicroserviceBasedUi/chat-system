import { Sprint, Release, Story, ReleaseScope } from '../shared';
import { bindable, inject } from "aurelia-framework";
import { HttpClient, json } from 'aurelia-fetch-client';
import { EventAggregator } from 'aurelia-event-aggregator';

@inject(HttpClient, EventAggregator)
export class PlanningSettings {

    public availableSprints: Array<Sprint> = [];
    private endSprintId: string;

    constructor(private http: HttpClient, private hub: EventAggregator) {

        const self = this;
        this.http.fetch('http://localhost:8000/api/backlog/sprints')
            .then(response => <Promise<Array<Sprint>>>response.json())
            .then(sprints => {
                self.availableSprints = sprints;
                self.selectedEndSprint = sprints[0].name;
            });
    }

    set selectedEndSprint(value) {
        this.endSprintId = value;

        this.publishScope();
    }

    get selectedEndSprint() {
        return this.endSprintId;
    }

    private publishScope(): void {
        if (this.endSprintId != undefined) {

            const settings: ReleaseScope = {
                sprints: this.availableSprints,
                startSprint: this.availableSprints[0],
                endSprint: null
            };

            this.availableSprints.forEach(sprint => {

                if(sprint.name == this.endSprintId) {
                    settings.endSprint = sprint;
                }
            });

            this.hub.publish('ReleaseScopeChanged', settings);
        }
    }
}
