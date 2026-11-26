// Короткая тактильная отдача на iPhone (UIImpactFeedbackGenerator). Вызывается из GameRoot.Haptic: ce_haptic(0|1|2).
#import <UIKit/UIKit.h>

extern "C" void ce_haptic(int style)
{
    UIImpactFeedbackStyle s = style >= 2 ? UIImpactFeedbackStyleHeavy : (style == 1 ? UIImpactFeedbackStyleMedium : UIImpactFeedbackStyleLight);
    UIImpactFeedbackGenerator *g = [[UIImpactFeedbackGenerator alloc] initWithStyle:s];
    [g prepare];
    [g impactOccurred];
}
