// NovaSports C6 UI preview: runs the firmware UI code on the PC and writes PPM frames.
//   g++ -O2 -std=c++17 -I<ArduinoJson>/src sim/sim_main.cpp novasports_display/src/{gfx,ui,model,protocol}.cpp -o sim/sim
//   sim/sim build/assets.bin outdir
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <vector>
#include "../novasports_display/src/assets.h"
#include "../novasports_display/src/gfx.h"
#include "../novasports_display/src/model.h"
#include "../novasports_display/src/ui.h"
static void ppm(const char* path, const uint16_t* fb) {
  FILE* f = fopen(path, "wb"); fprintf(f, "P6\n%d %d\n255\n", gfx::W, gfx::H);
  for (int i = 0; i < gfx::W * gfx::H; i++) { uint16_t c = fb[i]; uint8_t p[3] = {(uint8_t)(((c >> 11) & 31) * 255 / 31), (uint8_t)(((c >> 5) & 63) * 255 / 63), (uint8_t)((c & 31) * 255 / 31)}; fwrite(p, 1, 3, f); }
  fclose(f);
}
int main(int argc, char** argv) {
  FILE* f = fopen(argv[1], "rb"); fseek(f, 0, SEEK_END); long n = ftell(f); fseek(f, 0, SEEK_SET);
  std::vector<uint8_t> blob(n); fread(blob.data(), 1, n, f); fclose(f);
  Assets as; if (!as.load(blob.data())) { fprintf(stderr, "asset mismatch\n"); return 1; }
  Model m; Ui ui; m.real = true;
  ui.begin(&as, &m); ui.setDeviceName("NovaSports-EB60");
  std::vector<uint16_t> fb(gfx::W * gfx::H); gfx::Canvas c; c.band(fb.data(), 0, gfx::H);
  m.m.hr = 142; m.m.spo2 = 97; m.m.cadence = 166; m.m.battery = 76; m.m.temp = 33.9f; m.m.steps = 4213;
  m.hrOk = m.spo2Ok = m.cadOk = m.tempOk = true; m.m.zone = 3; m.m.readiness = 78;
  m.epochOffset = 1790000000 + 3600 * 5; m.timeValid = true;
  float t = 0; char path[256];
  auto step = [&](float secs) { for (float x = 0; x < secs; x += 1 / 30.f) { for (int i = 0; i < 160; i++) m.pushPpg(sinf((t + x) * 6.2831f * 1.4f) * .6f + sinf((t + x) * 12.5f) * .2f); m.update(1 / 30.f, t + x); ui.update(1 / 30.f); } t += secs; };
  auto shot = [&](const char* name) { ui.render(c); snprintf(path, sizeof path, "%s/%s.ppm", argv[2], name); ppm(path, fb.data()); };
  step(.5f); shot("boot0"); step(1.6f); shot("boot1"); step(.6f); shot("boot2");
  step(2.5f); shot("live");
  ui.setLink(Link::Ble, "Web Bluetooth"); ui.goPage(1); step(1.2f); shot("run_idle");
  m.start(); m.m.elapsed = 812; m.m.dist = 2.41f; m.m.kcal = 210; m.m.pace = 332; step(1.2f); shot("run");
  ui.goPage(2); step(1.5f); shot("ready");
  ui.goPage(3); step(1.5f); shot("link");
  ui.goPage(0); step(1.0f); ui.toast("Coach: ease off", 0xFFC0); step(.8f); shot("live_run_toast");
  return 0;
}
