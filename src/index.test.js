import * as lite from './unpacker/index';

it('should have the appropriate keys', () => {
    expect(lite.agents).toBeTruthy();
    expect(lite.feature).toBeTruthy();
    expect(lite.features).toBeTruthy();
    expect(lite.region).toBeTruthy();
});
